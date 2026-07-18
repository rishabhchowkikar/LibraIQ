const prisma = require("../config/database");

const {
  sendOverdueEmail,
  sendAdminOverdueReport,
  sleep,
} = require("./email.service");
const { createNotification } = require("./notification.service");
const FINE_RATE = parseFloat(process.env.FINE_RATE_STANDARD || "5");
const FINE_CAP = parseFloat(process.env.FINE_CAP || "200");
const GRACE_DAYS = parseInt(process.env.FINE_GRACE_DAYS || "0");

/**
 * Core accrual logic — called by cron job daily
 */

const runFineAccrual = async () => {
  console.log("💰 Running fine accrual job...");

  const now = new Date();
  const graceDate = new Date(now);
  graceDate.setDate(graceDate.getDate() - GRACE_DAYS);

  try {
    // Find all active loans past due date
    const overdueLoans = await prisma.loan.findMany({
      where: {
        status: { in: ["ACTIVE", "OVERDUE"] },
        dueDate: { lt: graceDate },
      },
      include: {
        student: true,
        book: true,
        fines: {
          where: { paidAt: null, waivedBy: null },
        },
      },
    });

    console.log(`📋 Found ${overdueLoans.length} overdue loans`);

    let accrued = 0;
    let newlyOverdue = 0;

    for (const loan of overdueLoans) {
      // Calculate days overdue
      const daysOverdue = Math.ceil(
        (now.getTime() - new Date(loan.dueDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      // Calculate raw fine amount
      const rawFine = daysOverdue * FINE_RATE;

      // Get exisiting fine total for this loan
      const existingFineTotal = loan.fines.reduce(
        (sum, f) => sum + f.amount,
        0,
      );

      // Apply cap
      const cappedFine = Math.min(rawFine, FINE_CAP);
      const fineToAdd = Math.max(0, cappedFine - existingFineTotal);

      // updated loan status to overdue
      const wasActive = loan.status === "ACTIVE";

      await prisma.loan.update({
        where: { id: loan.id },
        data: { status: "OVERDUE" },
      });

      if (wasActive) {
        newlyOverdue++;
      }

      // Only create fine if there's something to add
      if (fineToAdd > 0) {
        // Update existing unpaid fine or create new one
        const existingFine = loan.fines[0];

        if (existingFine) {
          await prisma.fine.update({
            where: { id: existingFine.id },
            data: {
              amount: Math.min(existingFine.amount + FINE_RATE, FINE_CAP),
              reason: `Overdue by ${daysOverdue} day${daysOverdue > 1 ? "s" : ""}`,
            },
          });
        } else {
          await prisma.fine.create({
            data: {
              loanId: loan.id,
              studentId: loan.studentId,
              amount: Math.min(FINE_RATE, FINE_CAP),
              reason: `Overdue by ${daysOverdue} day${daysOverdue > 1 ? "s" : ""}`,
            },
          });
        }

        accrued++;
        // Send email + notification only on first day or every 7 days

        const shouldNotify =
          wasActive || daysOverdue === 1 || daysOverdue % 7 === 0;
        if (shouldNotify) {
          const totalFine = Math.min(daysOverdue * FINE_RATE, FINE_CAP);

          // Email notification
          await sendOverdueEmail({
            student: loan.student,
            book: loan.book,
            daysOverdue,
            fineAmount: totalFine,
          }).catch((err) => console.warn("Email failed:", err.message));

          await sleep(2000);

          // In-app notification
          await createNotification({
            userId: loan.studentId,
            type: "OVERDUE_ALERT",
            message: `"${loan.book.title}" is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue. Current fine: ₹${totalFine}`,
          });
        }
      }
    }

    console.log(
      `✅ Fine accrual complete: ${accrued} fines updated, ${newlyOverdue} newly marked overdue`,
    );
    return { processed: overdueLoans.length, accrued, newlyOverdue };
  } catch (error) {
    console.error("❌ Fine accrual failed:", error.message);
    throw error;
  }
};

/**
 * Send due date reminders — called by cron job daily
 */

const sendDueReminders = async () => {
  console.log("📅 Running due date reminder job...");

  const { sendDueReminderEmail } = require("./email.service");

  const now = new Date();
  const remindDays = [1, 3];

  let sent = 0;

  for (const daysAhead of remindDays) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysAhead);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const loansToRemind = await prisma.loan.findMany({
      where: {
        status: "ACTIVE",
        dueDate: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      include: {
        student: true,
        book: true,
      },
    });

    for (const loan of loansToRemind) {
      // Send Email
      await sendDueReminderEmail({
        student: loan.student,
        book: loan.book,
        dueDate: loan.dueDate,
        daysLeft: daysAhead,
      }).catch((err) => console.warn("Email failed:", err.message));

      await sleep(2000); // ← ADD

      // In - app notifications
      await createNotification({
        userId: loan.studentId,
        type: "DUE_REMINDER",
        message: `"${loan.book.title}" is due ${daysAhead === 1 ? "tomorrow" : `in ${daysAhead} days`} — ${new Date(loan.dueDate).toLocaleDateString("en-IN")}`,
      });
      sent++;
    }
  }

  // Also remind for books due today
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dueTodayLoans = await prisma.loan.findMany({
    where: {
      status: "ACTIVE",
      dueDate: { gte: today, lt: tomorrow },
    },
    include: {
      student: true,
      book: true,
    },
  });

  for (const loan of dueTodayLoans) {
    await sendDueReminderEmail({
      student: loan.student,
      book: loan.book,
      dueDate: loan.dueDate,
      daysLeft: 0,
    }).catch((err) => console.warn("Email failed:", err.message));

    await sleep(2000);

    await createNotification({
      userId: loan.studentId,
      type: "DUE_REMINDER",
      message: `"${loan.book.title}" is due today! Return it to avoid a fine.`,
    });

    sent++;
  }

  console.log(`✅ Sent ${sent} due reminders`);
  return { sent };
};

/**
 * Generate + send the admin overdue report to all active admins
 */

const runAdminOverdueReport = async () => {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { email: true },
  });

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

  return {
    adminsNotified: admins.length,
    overdueCount: overdueLoans.length,
    totalFines,
  };
};

module.exports = {
  runFineAccrual,
  sendDueReminders,
  runAdminOverdueReport,
};
