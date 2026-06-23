const prisma = require("../config/database");
const { createNotification } = require("./notification.service");
const { sendEmail, sleep } = require("./email.service");

// ─── Tier thresholds ──────────────────────────────────────────
const TIERS = {
  BRONZE: { min: 0, max: 39 },
  SILVER: { min: 40, max: 59 },
  GOLD: { min: 60, max: 79 },
  PLATINUM: { min: 80, max: 100 },
};

const getTierFromScore = (score) => {
  if (score >= 80) return "PLATINUM";
  if (score >= 60) return "GOLD";
  if (score >= 40) return "SILVER";
  return "BRONZE";
};

const getNextTier = (tier) => {
  const order = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];
  const idx = order.indexOf(tier);
  return idx < order.length - 1 ? order[idx + 1] : null;
};

const getPointsToNextTier = (score, tier) => {
  const thresholds = { BRONZE: 40, SILVER: 60, GOLD: 80, PLATINUM: null };
  const next = thresholds[tier];
  return next ? next - score : 0;
};

// ─── Core Score Computation ───────────────────────────────────
const computeStudentScore = async (studentId) => {
  const BASE_SCORE = 50;
  let score = BASE_SCORE;

  const breakdown = {
    baseScore: BASE_SCORE,
    earlyReturnBonus: 0,
    onTimeBonus: 0,
    latePenalty: 0,
    lostBookPenalty: 0,
    cleanStreakBonus: 0,
    unpaidFinePenalty: 0,
    patternPenalty: 0,
  };

  // ── Fetch all loans ──────────────────────────────────────────
  const loans = await prisma.loan.findMany({
    where: { studentId },
    orderBy: { issuedAt: "desc" },
  });

  // ── Fetch unpaid fines older than 14 days ────────────────────
  const oldUnpaidFines = await prisma.fine.findMany({
    where: {
      studentId,
      paidAt: null,
      waivedBy: null,
      createdAt: {
        lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    },
  });

  const stats = {
    totalLoans: loans.length,
    earlyReturns: 0,
    onTimeReturns: 0,
    lateReturns: 0,
    lostBooks: 0,
    consecutiveLate: 0,
  };

  // ── Process each loan ────────────────────────────────────────
  const completedLoans = loans.filter(
    (l) =>
      l.status === "RETURNED" || l.status === "OVERDUE" || l.status === "LOST",
  );

  let consecutiveLateCount = 0;

  for (const loan of completedLoans) {
    if (loan.status === "LOST") {
      score -= 25;
      breakdown.lostBookPenalty -= 25;
      stats.lostBooks++;
      consecutiveLateCount = 0; // Reset streak on lost book
      continue;
    }

    if (!loan.returnedAt) continue;

    const dueDate = new Date(loan.dueDate);
    const returnedAt = new Date(loan.returnedAt);
    const diffDays = Math.ceil(
      (returnedAt.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) {
      // return early
      score += 7;
      breakdown.earlyReturnBonus += 7;
      stats.earlyReturns++;
      consecutiveLateCount = 0;
    } else if (diffDays === 0) {
      // retuirn on time
      score += 5;
      breakdown.onTimeBonus += 5;
      stats.onTimeReturns++;
      consecutiveLateCount = 0;
    } else if (diffDays <= 3) {
      score -= 5;
      breakdown.latePenalty -= 5;
      stats.lateReturns++;
      consecutiveLateCount++;
    } else if (diffDays <= 7) {
      score -= 10;
      breakdown.latePenalty -= 10;
      stats.lateReturns++;
      consecutiveLateCount++;
    } else {
      score -= 15;
      breakdown.latePenalty -= 15;
      stats.lateReturns++;
      consecutiveLateCount++;
    }
  }

  stats.consecutiveLate = consecutiveLateCount;

  // ── Pattern penalty: 3+ consecutive late returns ─────────────
  if (consecutiveLateCount >= 3) {
    score -= 20;
    breakdown.patternPenalty -= 20;
  }

  // ── Unpaid fine older than 14 days ───────────────────────────
  if (oldUnpaidFines.length > 0) {
    const penalty = oldUnpaidFines.length * 10;
    score -= penalty;
    breakdown.unpaidFinePenalty -= penalty;
  }

  // ── Clean streak bonus: no issues in last 30 days ────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentIssues = await prisma.fine.count({
    where: { studentId, createdAt: { gte: thirtyDaysAgo } },
  });

  const recentOverDue = loans.filter(
    (l) => l.status === "OVERDUE" && new Date(l.dueDate) >= thirtyDaysAgo,
  ).length;

  if (recentIssues === 0 && recentOverDue === 0 && completedLoans.length > 0) {
    score += 10;
    breakdown.cleanStreakBonus += 10;
  }

  // ── Cap score between 0 and 100 ──────────────────────────────
  score = Math.max(0, Math.min(100, Math.round(score)));

  const tier = getTierFromScore(score);
  const nextTier = getNextTier(tier);
  const pointsToNextTier = getPointsToNextTier(score, tier);

  return {
    score,
    tier,
    nextTier,
    pointsToNextTier,
    breakdown,
    stats,
  };
};

// ─── Send Tier Change Email ───────────────────────────────────
const sendTierChangeEmail = async ({ student, oldTier, newTier, score }) => {
  const isUpgrade =
    ["BRONZE", "SILVER", "GOLD", "PLATINUM"].indexOf(newTier) >
    ["BRONZE", "SILVER", "GOLD", "PLATINUM"].indexOf(oldTier);

  const tierEmoji = {
    BRONZE: "🥉",
    SILVER: "🥈",
    GOLD: "🥇",
    PLATINUM: "💎",
  };

  const subject = isUpgrade
    ? `🎉 Congratulations! You've been upgraded to ${newTier} tier`
    : `📉 Your trust tier has changed to ${newTier}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
        .header { background: ${isUpgrade ? "#16a34a" : "#dc2626"}; padding: 28px 36px; }
        .header h1 { color: white; margin: 0; font-size: 22px; }
        .body { padding: 28px 36px; }
        .tier-box { background: #f9fafb; border: 2px solid ${isUpgrade ? "#16a34a" : "#dc2626"}; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
        .tier-name { font-size: 28px; font-weight: 700; color: ${isUpgrade ? "#16a34a" : "#dc2626"}; }
        .score-box { background: #f0f9ff; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0; }
        .footer { background: #f9fafb; padding: 16px 36px; border-top: 1px solid #e5e7eb; text-align: center; }
        p { color: #374151; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isUpgrade ? "🎉 Tier Upgrade!" : "📉 Tier Change"}</h1>
        </div>
        <div class="body">
          <p>Hi <strong>${student.name.split(" ")[0]}</strong>,</p>
          <p>${
            isUpgrade
              ? "Great news! Your reading behaviour has earned you a tier upgrade."
              : "Your trust tier has been updated based on recent activity."
          }</p>

          <div class="tier-box">
            <p style="color:#6b7280;margin:0 0 8px;font-size:14px">
              ${tierEmoji[oldTier]} ${oldTier} → ${tierEmoji[newTier]} ${newTier}
            </p>
            <div class="tier-name">${tierEmoji[newTier]} ${newTier}</div>
            <p style="color:#6b7280;margin:8px 0 0;font-size:14px">Your new tier</p>
          </div>

          <div class="score-box">
            <p style="color:#6b7280;margin:0 0 4px;font-size:13px">Your Reader Score</p>
            <p style="font-size:36px;font-weight:700;color:#2563eb;margin:0">${score}</p>
            <p style="color:#6b7280;margin:4px 0 0;font-size:12px">out of 100</p>
          </div>

          ${
            isUpgrade
              ? `<p>Keep up the great work! Return books on time and stay active to maintain your tier.</p>`
              : `<p>Return books on time and clear any outstanding fines to improve your score.</p>`
          }
        </div>
        <div class="footer">
          <p style="color:#9ca3af;font-size:12px;margin:0">LibraIQ — Intelligent Library Management</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: student.email, subject, html });
};

// ─── Recompute All Students (Weekly Cron) ────────────────────
const recomputeAllScores = async () => {
  console.log("🧠 Running weekly Reader Score recomputation...");

  const students = await prisma.user.findMany({
    where: { role: "STUDENT", isActive: true },
    select: { id: true, name: true, email: true, trustTier: true },
  });

  let upgraded = 0;
  let downgraded = 0;
  let unchanged = 0;

  for (const student of students) {
    try {
      const { score, tier } = await computeStudentScore(student.id);
      const oldTier = student.trustTier;

      // update score in db
      await prisma.user.update({
        where: { id: student.id },
        data: { trustTier: tier },
      });

      // Check if tier changed

      if (tier !== oldTier) {
        const tierOrder = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];
        const isUpgrade = tierOrder.indexOf(tier) > tierOrder.indexOf(oldTier);

        if (isUpgrade) upgraded++;
        else downgraded++;

        // Send tier change email
        await sendTierChangeEmail({
          student,
          oldTier,
          newTier: tier,
          score,
        }).catch((err) =>
          console.warn(`Tier email failed for ${student.email}:`, err.message),
        );

        await sleep(2000);

        // In-app notification
        await createNotification({
          userId: student.id,
          type: "TIER_CHANGE",
          message: isUpgrade
            ? `🎉 Congratulations! You've been upgraded to ${tier} tier. Your Reader Score: ${score}/100`
            : `Your trust tier has changed from ${oldTier} to ${tier}. Reader Score: ${score}/100`,
        });

        console.log(
          `   ${isUpgrade ? "⬆️" : "⬇️"} ${student.name}: ${oldTier} → ${tier} (score: ${score})`,
        );
      } else {
        unchanged++;
      }
    } catch (error) {
      console.error(`   ❌ Failed for ${student.name}:`, error.message);
    }
  }

  console.log(`✅ Score recomputation complete:`);
  console.log(`   ⬆️  Upgraded: ${upgraded}`);
  console.log(`   ⬇️  Downgraded: ${downgraded}`);
  console.log(`   ➡️  Unchanged: ${unchanged}`);

  return { upgraded, downgraded, unchanged, total: students.length };
};

module.exports = {
  computeStudentScore,
  recomputeAllScores,
  getTierFromScore,
  sendTierChangeEmail,
};
