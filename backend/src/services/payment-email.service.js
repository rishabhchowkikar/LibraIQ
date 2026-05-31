const { sendEmail } = require("../services/email.service");

const sendPaymentReceiptEmail = async ({
  student,
  amount,
  receipt,
  method,
  fineCount,
  allCleared,
}) => {
  const methodLabel =
    {
      ONLINE: "Online (Razorpay)",
      CASH: "Cash at Counter",
      LINK: "UPI / Payment Link",
    }[method] || method;

  const subject = `✅ Payment Receipt — ${receipt}`;

  const html = `
  <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header { background: #16a34a; padding: 28px 36px; }
        .header h1 { color: white; margin: 0; font-size: 22px; }
        .header p { color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px; }
        .body { padding: 28px 36px; }
        .receipt-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 20px; margin: 20px 0; }
        .receipt-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
        .receipt-row:last-child { margin-bottom: 0; border-top: 1px solid #bbf7d0; padding-top: 10px; }
        .amount-big { font-size: 28px; font-weight: 700; color: #16a34a; }
        .success-banner { background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 12px 16px; margin: 16px 0; text-align: center; color: #15803d; font-weight: 600; }
        .footer { background: #f9fafb; padding: 16px 36px; border-top: 1px solid #e5e7eb; text-align: center; }
        p { color: #374151; line-height: 1.6; margin: 0 0 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Payment Confirmed</h1>
          <p>LibraIQ Library Management System</p>
        </div>
        <div class="body">
          <p>Hi <strong>${student.name.split(" ")[0]}</strong>,</p>
          <p>Your payment has been successfully processed. Here's your receipt:</p>

          <div class="receipt-box">
            <div class="receipt-row">
              <span style="color:#6b7280">Receipt No.</span>
              <strong>${receipt}</strong>
            </div>
            <div class="receipt-row">
              <span style="color:#6b7280">Payment Method</span>
              <strong>${methodLabel}</strong>
            </div>
            <div class="receipt-row">
              <span style="color:#6b7280">Fines Cleared</span>
              <strong>${fineCount} fine${fineCount > 1 ? "s" : ""}</strong>
            </div>
            <div class="receipt-row">
              <span style="color:#6b7280">Date</span>
              <strong>${new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}</strong>
            </div>
            <div class="receipt-row">
              <span style="color:#6b7280">Total Paid</span>
              <span class="amount-big">₹${amount}</span>
            </div>
          </div>

          ${
            allCleared
              ? `
            <div class="success-banner">
              🎉 All fines cleared! Your account is fully active.
            </div>
          `
              : ""
          }

          <p style="color:#6b7280;font-size:14px">
            Keep this email as your payment confirmation. If you have any questions, contact the library.
          </p>
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

module.exports = { sendPaymentReceiptEmail };
