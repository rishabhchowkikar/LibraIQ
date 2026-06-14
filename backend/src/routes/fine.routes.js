const express = require("express");
const fineRouter = express.Router();
const fineController = require("../controllers/fine.controller");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roleCheck");

// Student routes
fineRouter.get(
  "/my-fines",
  authenticate,
  requireRole("STUDENT"),
  fineController.getMyFines,
);

// admin routes
fineRouter.get(
  "/",
  authenticate,
  requireRole("ADMIN"),
  fineController.getAllFines,
);

fineRouter.post(
  "/:id/pay",
  authenticate,
  requireRole("ADMIN"),
  fineController.markAsPaid,
);

fineRouter.post(
  "/:id/waive",
  authenticate,
  requireRole("ADMIN"),
  fineController.waiveFine,
);

// DEV ONLY: manual trigger routes for triggere
if (process.env.NODE_ENV === "development") {
  const {
    runFineAccrual,
    sendDueReminders,
  } = require("../services/fine.service");

  // POST /api/fines/test/run-accrual

  fineRouter.post(
    "/test/run-accrual",
    authenticate,
    requireRole("ADMIN"),
    async (req, res, next) => {
      try {
        console.log("🧪 Manual fine accrual triggered...");
        const results = await runFineAccrual();
        res.json({ message: "Fine accrual completed successfully.", results });
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .json({ error: "An error occurred while running fine accrual." });
      }
    },
  );

  // POST /api/fines/test/send-reminders\
  fineRouter.post(
    "/test/send-reminders",
    authenticate,
    requireRole("ADMIN"),
    async (req, res) => {
      try {
        console.log("🧪 Manual due reminder sending triggered...");
        const results = await sendDueReminders();
        res.json({ message: "Due reminders sent successfully.", results });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .json({ error: "An error occurred while sending due reminders." });
      }
    },
  );

  fineRouter.post(
    "/test/email/overdue",
    authenticate,
    requireRole("ADMIN"),
    async (req, res) => {
      try {
        const { sendOverdueEmail } = require("../services/email.service");
        await sendOverdueEmail({
          student: {
            name: "TEST Student",
            email: process.env.DEV_EMAIL_OVERRIDE,
          },
          book: {
            title: "Physics Volume-1",
            author: "NCERT",
          },
          daysOverdue: 5,
          fineAmount: 25,
        });

        res.json({
          success: true,
          message: "Overdue email sent - check inbox",
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    },
  );

  fineRouter.post(
    "/test/email/reminder",
    authenticate,
    requireRole("ADMIN"),
    async (req, res) => {
      try {
        const { sendDueReminderEmail } = require("../services/email.service");
        await sendDueReminderEmail({
          student: {
            name: "Test Student",
            email: process.env.DEV_EMAIL_OVERRIDE,
          },
          book: { title: "Physics Volume-2", author: "NCERT" },
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          daysLeft: 3,
        });

        res.json({
          success: true,
          message: "Reminder email sent - check inbox",
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    },
  );
  if (process.env.NODE_ENV === "development") {
    // Test admin overdue report email
    fineRouter.post(
      "/test/email/admin-report",
      authenticate,
      requireRole("ADMIN"),
      async (req, res) => {
        try {
          const prisma = require("../config/database");
          const {
            sendAdminOverdueReport,
          } = require("../services/email.service");

          // Fetch real admins from DB
          const admins = await prisma.user.findMany({
            where: { role: "ADMIN", isActive: true },
            select: { email: true, name: true },
          });

          // Fetch real overdue loans from DB
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
            });
          }

          res.json({
            success: true,
            message: `Admin report sent to ${admins.length} admin(s)`,
            sentTo: admins.map((a) => a.email),
            overdueLoanCount: overdueLoans.length,
            totalFines,
            redirectedTo: process.env.DEV_EMAIL_OVERRIDE,
          });
        } catch (error) {
          res.status(500).json({ success: false, error: error.message });
        }
      },
    );
  }
}

module.exports = fineRouter;
