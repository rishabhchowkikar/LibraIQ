const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  family: 4, // Force IPv4
});

//  Verify connection on startup
const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log("📧 Email service connected successfully");
    return true;
  } catch (error) {
    console.warn("⚠️  Email service not connected:", error.message);
    return false;
  }
};

// Base email wrapper
const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Email failed to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

// ─── Email Templates ─────────────────────────────────────────

const sendDueReminderEmail = async ({ student, book, dueDate, daysLeft }) => {
  const urgency = daysLeft <= 1 ? "🚨" : daysLeft <= 3 ? "⚠️" : "📖";
  const subject = `${urgency} ${book.title} is due ${daysLeft === 0 ? "today" : `in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: #2563eb; padding: 32px 40px; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
        .body { padding: 32px 40px; }
        .book-card { background: #f0f4ff; border: 1px solid #dbeafe; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
        .book-card h3 { margin: 0 0 4px; color: #1e40af; font-size: 16px; }
        .book-card p { margin: 0; color: #3b82f6; font-size: 14px; }
        .due-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; margin: 12px 0; }
        .urgent { background: #fee2e2; color: #dc2626; }
        .warning { background: #fef3c7; color: #d97706; }
        .normal { background: #d1fae5; color: #059669; }
        .footer { background: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb; text-align: center; }
        .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
        p { color: #374151; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📚 LibraIQ</h1>
          <p>Library Management System</p>
        </div>
        <div class="body">
          <p>Hey <strong>${student.name.split(" ")[0]}</strong>,</p>
          <p>Just a heads-up — one of your borrowed books is coming up on its due date.</p>

          <div class="book-card">
            <h3>${book.title}</h3>
            <p>by ${book.author}</p>
          </div>

          <div class="due-badge ${daysLeft === 0 ? "urgent" : daysLeft <= 3 ? "warning" : "normal"}">
            ${daysLeft === 0 ? "🚨 Due Today!" : daysLeft === 1 ? "⚠️ Due Tomorrow" : `📅 Due in ${daysLeft} days — ${new Date(dueDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}`}
          </div>

          <p>
            ${
              daysLeft === 0
                ? "Please return the book to the library today to avoid any late fees."
                : daysLeft === 1
                  ? "Please plan to return the book tomorrow. Late returns incur a fine of ₹5/day."
                  : `You have ${daysLeft} days remaining. Please return it by the due date to keep your reading record clean!`
            }
          </p>

          <p style="color: #6b7280; font-size: 14px;">
            💡 Late returns incur a fine of <strong>₹5 per day</strong>, capped at ₹200.
          </p>
        </div>
        <div class="footer">
          <p>LibraIQ — Intelligent Library Management</p>
          <p style="margin-top: 4px;">You're receiving this because you have an active loan.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: student.email, subject, html });
};

const sendOverdueEmail = async ({ student, book, daysOverdue, fineAmount }) => {
  const subject = `🚨 Overdue: ${book.title} — ₹${fineAmount} fine accrued`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: #dc2626; padding: 32px 40px; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
        .body { padding: 32px 40px; }
        .alert-box { background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
        .fine-amount { font-size: 32px; font-weight: 700; color: #dc2626; text-align: center; padding: 16px; }
        .book-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin: 12px 0; }
        .footer { background: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb; text-align: center; }
        .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
        p { color: #374151; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📚 LibraIQ</h1>
          <p>Overdue Notice</p>
        </div>
        <div class="body">
          <p>Hi <strong>${student.name.split(" ")[0]}</strong>,</p>

          <div class="alert-box">
            <p style="margin:0; color: #dc2626; font-weight: 600;">
              🚨 Your book is <strong>${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue</strong>
            </p>
          </div>

          <div class="book-card">
            <strong>${book.title}</strong>
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">by ${book.author}</p>
          </div>

          <p>Current fine:</p>
          <div class="fine-amount">₹${fineAmount}</div>

          <p style="font-size: 14px; color: #6b7280;">
            Fine rate: ₹5/day · Maximum cap: ₹200 · 
            ${fineAmount >= 200 ? '<strong style="color:#dc2626">Maximum fine reached — return immediately.</strong>' : `₹${200 - fineAmount} until cap`}
          </p>

          <p>
            Please return <strong>${book.title}</strong> to the library as soon as possible.
            Your account is currently <strong>blocked from new loans</strong> until outstanding fines are cleared.
          </p>
        </div>
        <div class="footer">
          <p>LibraIQ — Intelligent Library Management</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: student.email, subject, html });
};

const sendFineWaivedEmail = async ({ student, book, amount, reason }) => {
  const subject = `✅ Fine waived — ${book.title}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: #059669; padding: 32px 40px; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .body { padding: 32px 40px; }
        .success-box { background: #d1fae5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .success-box .amount { font-size: 28px; font-weight: 700; color: #059669; }
        .reason-box { background: #f9fafb; border-left: 4px solid #059669; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
        .footer { background: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb; text-align: center; }
        .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
        p { color: #374151; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📚 LibraIQ</h1>
        </div>
        <div class="body">
          <p>Great news, <strong>${student.name.split(" ")[0]}</strong>!</p>

          <div class="success-box">
            <p style="margin: 0 0 8px; color: #065f46;">Fine waived for <strong>${book.title}</strong></p>
            <p class="amount">₹${amount} waived</p>
          </div>

          <p>The librarian has waived your fine with the following note:</p>
          <div class="reason-box">
            <p style="margin: 0; font-style: italic; color: #374151;">"${reason}"</p>
          </div>

          <p>You can now borrow books again. Keep up the good reading! 📖</p>
        </div>
        <div class="footer">
          <p>LibraIQ — Intelligent Library Management</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: student.email, subject, html });
};

const sendFinePaidEmail = async ({ student, book, amount }) => {
  const subject = `✅ Fine payment confirmed — ${book.title}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
        .header { background: #2563eb; padding: 32px 40px; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .body { padding: 32px 40px; }
        .receipt { background: #f0f4ff; border: 1px solid #dbeafe; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .receipt-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
        .footer { background: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb; text-align: center; }
        .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
        p { color: #374151; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📚 LibraIQ</h1>
        </div>
        <div class="body">
          <p>Hi <strong>${student.name.split(" ")[0]}</strong>,</p>
          <p>Your fine payment has been confirmed. Here's your receipt:</p>

          <div class="receipt">
            <div class="receipt-row">
              <span style="color: #6b7280;">Book</span>
              <span style="font-weight: 600;">${book.title}</span>
            </div>
            <div class="receipt-row">
              <span style="color: #6b7280;">Amount Paid</span>
              <span style="font-weight: 700; color: #2563eb; font-size: 18px;">₹${amount}</span>
            </div>
            <div class="receipt-row">
              <span style="color: #6b7280;">Date</span>
              <span>${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
            <div class="receipt-row">
              <span style="color: #6b7280;">Status</span>
              <span style="color: #059669; font-weight: 600;">✅ Cleared</span>
            </div>
          </div>

          <p>Your account is now in good standing. Happy reading! 📚</p>
        </div>
        <div class="footer">
          <p>LibraIQ — Intelligent Library Management</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: student.email, subject, html });
};

const sendAdminOverdueReport = async ({
  adminEmail,
  overdueLoans,
  totalFines,
}) => {
  const subject = `📊 Daily Overdue Report — ${new Date().toLocaleDateString("en-IN")}`;

  const rows = overdueLoans
    .map(
      (loan) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${loan.student?.name}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${loan.book?.title}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${new Date(loan.dueDate).toLocaleDateString("en-IN")}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: 600;">
        ₹${loan.fines?.reduce((s, f) => s + f.amount, 0) || 0}
      </td>
    </tr>
  `,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 680px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
        .header { background: #1e293b; padding: 28px 40px; }
        .header h1 { color: white; margin: 0; font-size: 22px; }
        .header p { color: rgba(255,255,255,0.6); margin: 6px 0 0; font-size: 13px; }
        .body { padding: 28px 40px; }
        .summary { display: flex; gap: 16px; margin-bottom: 24px; }
        .stat-box { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; }
        .stat-box .num { font-size: 28px; font-weight: 700; }
        .stat-box .label { font-size: 12px; color: #6b7280; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th { background: #f9fafb; padding: 10px 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 16px 40px; border-top: 1px solid #e5e7eb; text-align: center; }
        .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📚 LibraIQ — Daily Overdue Report</h1>
          <p>Generated on ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div class="body">
          <div class="summary">
            <div class="stat-box">
              <div class="num" style="color: #dc2626;">${overdueLoans.length}</div>
              <div class="label">Overdue Loans</div>
            </div>
            <div class="stat-box">
              <div class="num" style="color: #d97706;">₹${totalFines}</div>
              <div class="label">Total Outstanding Fines</div>
            </div>
          </div>

          ${
            overdueLoans.length > 0
              ? `
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Book</th>
                  <th>Due Date</th>
                  <th>Fine</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          `
              : '<p style="text-align:center; color: #059669; font-weight: 600;">🎉 No overdue loans today!</p>'
          }
        </div>
        <div class="footer">
          <p>LibraIQ — Intelligent Library Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: adminEmail, subject, html });
};

module.exports = {
  verifyEmailConnection,
  sendDueReminderEmail,
  sendOverdueEmail,
  sendFineWaivedEmail,
  sendFinePaidEmail,
  sendAdminOverdueReport,
  sendEmail,
};
