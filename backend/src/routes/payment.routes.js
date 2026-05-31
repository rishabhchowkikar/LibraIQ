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

module.exports = paymentRouter;
