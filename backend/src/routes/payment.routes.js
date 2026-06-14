const express = require("express");
const paymentRouter = express.Router();
const paymentController = require("../controllers/payment.controller");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roleCheck");

// ── Webhook — NO auth, raw body ──────────────────────────────
paymentRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook,
);

// students routes
paymentRouter.post(
  "/create-order",
  authenticate,
  requireRole("STUDENT"),
  paymentController.createOrder,
);

paymentRouter.post(
  "/verify",
  authenticate,
  requireRole("STUDENT"),
  paymentController.verifyPayment,
);

paymentRouter.post(
  "/mark-failed",
  authenticate,
  requireRole("STUDENT"),
  paymentController.markFailed,
);

paymentRouter.get(
  "/my-history",
  authenticate,
  requireRole("STUDENT"),
  paymentController.getMyHistory,
);

// admin routes

paymentRouter.post(
  "/create-link",
  authenticate,
  requireRole("ADMIN"),
  paymentController.createPaymentLink,
);

paymentRouter.get(
  "/",
  authenticate,
  requireRole("ADMIN"),
  paymentController.getAllPayments,
);

if (process.env.NODE_ENV === "development") {
  paymentRouter.post("/test/email", async (req, res) => {
    try {
      const {
        sendPaymentReceiptEmail,
      } = require("../services/payment-email.service");

      await sendPaymentReceiptEmail({
        student: {
          name: "Test Student",
          email: "vikram@student.com",
        },
        amount: 40,
        receipt: `LIQ-TEST-${Date.now()}`,
        method: "ONLINE",
        fineCount: 1,
        allCleared: true,
      });

      res.json({ success: true, message: "Check Gmail!" });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

module.exports = paymentRouter;
