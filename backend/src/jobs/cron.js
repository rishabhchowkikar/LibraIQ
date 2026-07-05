const cron = require("node-cron");
const {
  runFineAccrual,
  sendDueReminders,
} = require("../services/fine.service");
const { sendAdminOverdueReport, sleep } = require("../services/email.service");
const { recomputeAllScores } = require("../services/reader-score.service");

const { expireReservations } = require("../services/reservation.service");
const prisma = require("../config/database");
const initCronjobs = () => {
  console.log("⏰ Initializing cron jobs...");

  // ─── Fine Accrual — Every day at midnight ─────────────────
  cron.schedule("0 0 * * *", async () => {
    console.log("\n🕛 [CRON] Midnight — Running fine accrual...");
    try {
      const result = await runFineAccrual();
      console.log("✅ [CRON] Fine accrual complete:", result);
    } catch (error) {
      console.error("❌ [CRON] Fine accrual failed:", error.message);
    }
  });

  // ─── Due Date Reminders — Every day at 9 AM ───────────────
  cron.schedule("0 9 * * *", async () => {
    console.log("\n🕘 [CRON] 9AM — Sending due reminders...");
    try {
      const result = await sendDueReminders();
      console.log("✅ [CRON] Due reminders sent:", result);
    } catch (error) {
      console.error("❌ [CRON] Due reminders failed:", error.message);
    }
  });

  // ─── Admin Overdue Report — Every day at 9 AM ─────────────
  cron.schedule("10 9 * * *", async () => {
    console.log("\n📊 [CRON] Generating admin overdue report...");
    try {
      // Get all admins
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", isActive: true },
        select: { email: true },
      });

      // Get overdue loans with fines
      const overdueLoans = await prisma.loan.findMany({
        where: { status: "OVERDUE" },
        include: {
          student: { select: { name: true, email: true } },
          book: { select: { title: true, author: true } },
          fines: { where: { paidAt: null } },
        },
      });

      const totalFines = overdueLoans.reduce(
        (sum, loan) => sum + loan.fines.reduce((s, f) => s + f.amount, 0),
        0,
      );

      // Send to each admin
      for (const admin of admins) {
        await sendAdminOverdueReport({
          adminEmail: admin.email,
          overdueLoans,
          totalFines,
        }).catch((err) =>
          console.warn(`Admin report email failed: ${err.message}`),
        );
        await sleep(2000);
      }

      console.log(`✅ [CRON] Admin report sent to ${admins.length} admin(s)`);
    } catch (error) {
      console.error("❌ [CRON] Admin report failed:", error.message);
    }
  });

  // ─── Reader Score Recomputation — Every Sunday midnight ────
  cron.schedule("10 0 * * 0", async () => {
    console.log("\n🧠 [CRON] Sunday — Recomputing all Reader Scores...");
    try {
      const result = await recomputeAllScores();
      console.log("✅ [CRON] Score recomputation complete:", result);
    } catch (error) {
      console.error("❌ [CRON] Score recomputation failed:", error.message);
    }
  });

  // Every hour — check expired reservations
  cron.schedule("0 * * * *", async () => {
    console.log("\n⏰ [CRON] Hourly — Checking expired reservations...");
    try {
      const count = await expireReservations();
      if (count > 0) console.log(`✅ ${count} reservation(s) expired`);
    } catch (error) {
      console.error("❌ Reservation expiry failed:", error.message);
    }
  });

  console.log("✅ Cron jobs initialized:");
  console.log("   • Fine accrual    → daily at midnight");
  console.log("   • Due reminders   → daily at 9:00");
  console.log("   • Admin report    → daily at 10:10");
  console.log("   • Reader Score    → every Sunday at 12:10");
  console.log("   • Reservations    → hourly");
};

module.exports = { initCronjobs };
