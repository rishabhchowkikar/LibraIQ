const prisma = require("../config/database");
const paymentService = require("../services/payment.service");
const {
  sendPaymentReceiptEmail,
} = require("../services/payment-email.service");
const { createNotification } = require("../services/notification.service");

// ─── Helper: Check if all student fines cleared ───────────────
const allFinesCleared = async (studentId) => {
  const count = await prisma.fine.count({
    where: { studentId, paidAt: null, waivedBy: null },
  });

  return count === 0;
};

// ─── Helper: Mark fines paid + send receipt ───────────────────
const completeFinePayment = async ({
  fineIds,
  paymentId,
  paymentMethod,
  studentId,
  amount,
  receipt,
  method,
}) => {
  const student = await prisma.user.findUnique({ where: { id: studentId } });

  // mark fine as paid
  await prisma.fine.updateMany({
    where: { id: { in: fineIds } },
    data: {
      paidAt: new Date(),
      paymentId,
      paymentMethod,
    },
  });

  const cleared = await allFinesCleared(studentId);

  // send receipt email

  await sendPaymentReceiptEmail({
    student,
    amount,
    receipt,
    method,
    fineCount: fineIds.length,
    allCleared: cleared,
  }).catch((err) => console.warn("Receipt email failed:", err.message));

  // in app notification
  await createNotification({
    userId: studentId,
    type: "FINE_ALERT",
    message: cleared
      ? `🎉 All fines cleared! ₹${amount} paid. Account fully active. Receipt: ${receipt}`
      : `✅ Payment of ₹${amount} confirmed for ${fineIds.length} fine(s). Receipt: ${receipt}`,
  });

  return { cleared };
};

// ─── POST /api/payments/create-order ──────────────────────────
exports.createOrder = async (req, res) => {
  try {
    const { fineIds } = req.body;
    const studentId = req.user.userId;

    if (!fineIds || !Array.isArray(fineIds) || fineIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No fine IDs provided" });
    }

    // validate fines belong to the student and are unpaid
    const fines = await prisma.fine.findMany({
      where: { id: { in: fineIds }, studentId },
    });

    if (fines.length !== fineIds.length) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid fine selection" });
    }

    const alreadyCleared = fines.filter((f) => f.paidAt || f.waivedBy);
    if (alreadyCleared.length > 0) {
      return res.status(400).json({
        success: false,
        error: `${alreadyCleared.length} fine(s) already cleared. Please refresh.`,
      });
    }

    // ── EDGE CASE: Check for existing PENDING order ──────────
    const existingPayment = await prisma.payment.findFirst({
      where: {
        studentId,
        status: { in: ["CREATED", "PENDING"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingPayment && existingPayment.orderId) {
      const existingFineIds = existingPayment.fineIds;
      const isSameOrder =
        fineIds.length === existingFineIds.length &&
        fineIds.every((id) => existingFineIds.includes(id));

      if (isSameOrder) {
        console.log("↩️ Returning existing pending order");
        return res.json({
          success: true,
          orderId: existingPayment.orderId,
          amount: existingPayment.amount,
          receipt: existingPayment.receipt,
          keyId: process.env.RAZORPAY_KEY_ID,
        });
      }
    }

    // Create new order
    const totalAmount = fines.reduce((sum, f) => sum + f.amount, 0);
    const receipt = paymentService.generateReceipt();

    const { success, order, error } = await paymentService.createOrder({
      amount: totalAmount,
      receipt,
      notes: {
        studentId,
        fineCount: fineIds.length.toString(),
      },
    });

    if (!success) {
      return res.status(503).json({
        success: false,
        error: "Payment service unavailable. Please try again.",
      });
    }

    // save payment record
    const payment = await prisma.payment.create({
      data: {
        receipt,
        orderId: order.id,
        studentId,
        amount: totalAmount,
        method: "ONLINE",
        status: "CREATED",
        fineIds: fineIds,
      },
    });

    console.log(`💳 Payment order created: ${receipt} — ₹${totalAmount}`);

    return res.json({
      success: true,
      orderId: order.id,
      amount: totalAmount,
      receipt,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to create payment order" });
  }
};

// ─── POST /api/payments/verify ────────────────────────────────
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const studentId = req.user.userId;

    // ── SECURITY: Verify signature ───────────────────────────
    const isValid = paymentService.verifySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: "Payment verification failed — invalid signature",
      });
    }

    // find our payment record
    const payment = await prisma.payment.findUnique({
      where: { orderId: razorpay_order_id },
    });

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, error: "Payment record not found" });
    }

    // ── EDGE CASE: Already processed (idempotency) ───────────
    if (payment.status === "SUCCESS") {
      return res.json({
        success: true,
        message: "Payment already confirmed",
        receipt: payment.receipt,
      });
    }

    const fineIds = payment.fineIds;

    // ── EDGE CASE: Check fines still unpaid (conflict check) ──
    const fines = await prisma.fine.findMany({
      where: { id: { in: fineIds } },
    });

    const alreadyCleared = fines.filter((f) => f.paidAt || f.waivedBy);

    if (alreadyCleared.length > 0) {
      // Auto-refund — fines were cleared while payment was processing
      console.log(
        `⚠️ Conflict: ${alreadyCleared.length} fines already cleared — auto-refunding`,
      );

      const { success: refundSuccess } = await paymentService.createRefund({
        paymentId: razorpay_payment_id,
        amount: payment.amount,
      });

      await prisma.payment.update({
        where: { orderId: razorpay_order_id },
        data: {
          paymentId: raozrpay_order_id,
          status: "REFUNDED",
          failureReason: "Fines already cleared — auto-refunded",
        },
      });

      return res.status(409).json({
        success: false,
        error:
          "Some fines were already cleared. Your payment has been automatically refunded (5-7 business days).",
      });
    }

    // ── All good — complete payment ───────────────────────────
    await prisma.payment.update({
      where: { orderId: razorpay_order_id },
      data: {
        paymentId: razorpay_payment_id,
        status: "SUCCESS",
        paidAt: new Date(),
      },
    });

    const { cleared } = await completeFinePayment({
      fineIds,
      paymentId: payment.id,
      paymentMethod: "ONLINE",
      studentId,
      amount: payment.amount,
      receipt: payment.receipt,
      method: "ONLINE",
    });

    console.log(`✅ Payment verified: ${payment.receipt} — ₹${payment.amount}`);

    res.json({
      success: true,
      message: cleared
        ? "🎉 All fines cleared! Account fully active."
        : "✅ Payment confirmed!",
      receipt: payment.receipt,
      allCleared: cleared,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    res
      .status(500)
      .json({ success: false, error: "Payment verification failed" });
  }
};

// ─── POST /api/payments/mark-failed ──────────────────────────
exports.markFailed = async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    await prisma.payment.updateMany({
      where: { orderId, status: { in: ["CREATED", "PENDING"] } },
      data: {
        status: "FAILED",
        failureReason: reason || "Payment Abandoned",
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update payment" });
  }
};

// ─── POST /api/payments/create-link (Admin) ───────────────────
exports.createPaymentLink = async (req, res) => {
  try {
    const { fineIds, studentId } = req.body;
    const adminId = req.user.userId;

    const fines = await prisma.fine.findMany({
      where: { id: { in: fineIds }, studentId, paidAt: null, waivedBy: null },
    });

    if (fines.length !== fineIds.length) {
      return res
        .status(400)
        .json({ success: false, error: "Some fines already cleared" });
    }

    const student = await prisma.user.findUnique({ where: { id: studentId } });

    const totalAmount = fines.reduce((sum, f) => sum + f.amount, 0);
    const receipt = paymentService.generateReceipt();

    const { success, link, error } = await paymentService.createPaymentLink({
      amount: totalAmount,
      studentName: student.name,
      studentEmail: student.email,
      description: `LibraIQ fine payment — ${fines.length} fine(s) — ${receipt}`,
    });

    if (!success) {
      return res
        .status(503)
        .json({ success: false, error: "Failed to generate payment link" });
    }

    await prisma.payment.create({
      data: {
        receipt,
        linkId: link.id,
        studentId,
        amount: totalAmount,
        method: "LINK",
        status: "PENDING",
        fineIds,
        createdBy: adminId,
      },
    });

    console.log(
      `🔗 Payment link created: ${receipt} — ₹${totalAmount} for ${student.name}`,
    );

    res.json({
      success: true,
      shortUrl: link.short_url,
      amount: totalAmount,
      receipt,
      expiresAt: new Date(link.expire_by * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Create link error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to create payment link" });
  }
};

// ─── POST /api/payments/webhook ───────────────────────────────
// Note: this route need raw body - handle in routes files
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody;

    if (!rawBody) {
      return res.status(400).json({ error: "Empty body" });
    }

    const isValid = paymentService.verifyWebhookSignature({
      rawBody,
      signature,
    });
    if (!isValid) {
      console.warn("⚠️ Invalid webhook signature");
      return res.status(400).json({ error: "Invalid signature" });
    }

    const payload = JSON.parse(rawBody.toString());
    const { event } = payload;

    // console.log(`📡 Webhook received: ${event}`);

    // ── payment.captured (for ONLINE payments) ────────────────
    if (event === "payment.captured") {
      const rzpPayment = payload.payload.payment.entity;
      const orderId = rzpPayment.order_id;

      console.log("📡 payment.captured:", {
        orderId,
        paymentId: rzpPayment.id,
      });

      const payment = await prisma.payment.findFirst({
        where: { orderId },
      });

      if (!payment) {
        console.log(
          "ℹ️ payment.captured: no matching order (probably payment link — handled by payment_link.paid)",
        );
        return res.json({ status: "ok" });
      }

      if (payment.status === "SUCCESS") {
        console.log("ℹ️ Already processed");
        return res.json({ status: "ok" });
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentId: rzpPayment.id,
          status: "SUCCESS",
          paidAt: new Date(),
        },
      });

      await completeFinePayment({
        fineIds: payment.fineIds,
        paymentId: payment.id,
        paymentMethod: payment.method,
        studentId: payment.studentId,
        amount: payment.amount,
        receipt: payment.receipt,
        method: payment.method,
      });

      console.log(`✅ payment.captured processed: ${payment.receipt}`);
    }

    // ── payment_link.paid (for LINK payments) ─────────────────
    if (event === "payment_link.paid") {
      const paymentLinkEntity = payload.payload.payment_link.entity;
      const paymentEntity = payload.payload.payment.entity;

      const linkId = paymentLinkEntity.id; // plink_xxx
      const rzpPaymentId = paymentEntity.id; // pay_xxx

      console.log("📡 payment_link.paid:", { linkId, rzpPaymentId });

      const payment = await prisma.payment.findFirst({
        where: { linkId },
      });

      if (!payment) {
        console.warn(
          `⚠️ payment_link.paid: no payment found for linkId: ${linkId}`,
        );
        return res.json({ status: "ok" });
      }

      if (payment.status === "SUCCESS") {
        console.log("ℹ️ Already processed");
        return res.json({ status: "ok" });
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentId: rzpPaymentId,
          status: "SUCCESS",
          paidAt: new Date(),
        },
      });

      await completeFinePayment({
        fineIds: payment.fineIds,
        paymentId: payment.id,
        paymentMethod: "LINK",
        studentId: payment.studentId,
        amount: payment.amount,
        receipt: payment.receipt,
        method: "LINK",
      });

      console.log(`✅ payment_link.paid processed: ${payment.receipt}`);
    }

    // ── payment.failed ────────────────────────────────────────
    if (event === "payment.failed") {
      const rzpPayment = payload.payload.payment.entity;
      await prisma.payment.updateMany({
        where: { orderId: rzpPayment.order_id },
        data: {
          status: "FAILED",
          failureReason: rzpPayment.error_description || "Payment failed",
        },
      });
    }

    res.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};
// ─── GET /api/payments/my-history (Student) ───────────────────

exports.getMyHistory = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const payments = await prisma.payment.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });

    const totalPaid = payments
      .filter((p) => p.status === "SUCCESS")
      .reduce((sum, p) => sum + p.amount, 0);

    res.json({ success: true, payments, totalPaid });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch payment history" });
  }
};

// ─── GET /api/payments (Admin) ────────────────────────────────
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalCollected = payments
      .filter((p) => p.status === "SUCCESS")
      .reduce((sum, p) => sum + p.amount, 0);

    res.json({ success: true, payments, totalCollected });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch payments" });
  }
};
