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
}

module.exports = fineRouter;
