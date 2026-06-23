const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// generate unique receipt
const generateReceipt = () => {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `LIQ-${ts}-${rand}`;
};

// create razorpay order (online payment)
const createOrder = async ({ amount, receipt, notes = {} }) => {
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // convert to paise
      currency: "INR",
      receipt,
      notes,
    });

    return { success: true, order };
  } catch (error) {
    console.error("Razorpay create order error:", error);
    return { success: false, error: error.message };
  }
};

// create shareable payment link (admin generates for students)
const createPaymentLink = async ({
  amount,
  studentName,
  studentEmail,
  description,
}) => {
  try {
    const link = await razorpay.paymentLink.create({
      amount: Math.round(amount * 100), // convert to paise
      currency: "INR",
      description,
      customer: {
        name: studentName,
        email: studentEmail,
      },
      notify: { email: true },
      reminder_enable: false,
      expire_by: Math.floor(Date.now() / 1000) + 86400,
    });

    return { success: true, link };
  } catch (error) {
    console.error("Razorypay create link error:", error);
    return { success: false, error: error.message };
  }
};

// Verify payment signature - critical tamper check
const verifySignature = ({ orderId, paymentId, signature }) => {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
  return expected === signature;
};

// verify webhook signature
const verifyWebhookSignature = ({ rawBody, signature }) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.error("❌ RAZORPAY_WEBHOOK_SECRET not set in .env");
    return false;
  }
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  return expected === signature;
};

// triggered refund
const createRefund = async ({ paymentId, amount }) => {
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(amount * 100),
    });

    return { success: true, refund };
  } catch (error) {
    console.error("Razorpay refund error:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  generateReceipt,
  createOrder,
  createPaymentLink,
  verifySignature,
  verifyWebhookSignature,
  createRefund,
};
