const prisma = require("../config/database");
const { createNotification } = require("./notification.service");
const { sendEmail } = require("./email.service");
const { createLog } = require("./audit.service");

// Check and notify next reservation when book returned

const checkAndNotifyReservation = async (bookId) => {
  const nextReservation = await prisma.reservation.findFirst({
    where: { bookId, status: "PENDING" },
    orderBy: { reservedAt: "asc" },
    include: { student: true, book: true },
  });

  if (!nextReservation) return null;

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 24 hours from now

  await prisma.reservation.update({
    where: { id: nextReservation.id },
    data: {
      status: "NOTIFIED",
      notifiedAt: new Date(),
      expiresAt,
    },
  });

  // send notification
  await createNotification({
    userId: nextReservation.studentId,
    type: "RESERVATION_AVAILABLE",
    message: `📚 "${nextReservation.book.title}" is now available! You have 48 hours to borrow it. Visit the library soon!`,
  });

  // send email
  await sendEmail({
    to: nextReservation.student.email,
    subject: "Reservation Available",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;">
        <div style="background:#2563eb;padding:28px 36px;">
          <h1 style="color:white;margin:0;font-size:22px;">📚 Book Available!</h1>
        </div>
        <div style="padding:28px 36px;">
          <p>Hi <strong>${nextReservation.student.name.split(" ")[0]}</strong>,</p>
          <p>Great news! The book you reserved is now available:</p>
          <div style="background:#f0f4ff;border:1px solid #dbeafe;border-radius:8px;padding:16px;margin:16px 0;">
            <strong>${nextReservation.book.title}</strong>
            <p style="margin:4px 0 0;color:#6b7280;font-size:14px;">by ${nextReservation.book.author}</p>
          </div>
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin:16px 0;">
            <p style="margin:0;color:#92400e;font-weight:600;">⏰ You have 48 hours to collect this book!</p>
            <p style="margin:4px 0 0;color:#92400e;font-size:14px;">Expires: ${expiresAt.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <p>Visit the library to borrow it before your reservation expires.</p>
        </div>
        <div style="background:#f9fafb;padding:16px 36px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">LibraIQ — Intelligent Library Management</p>
        </div>
      </div>
    `,
  }).catch((err) => console.warn("Reservation email failed:", err.message));

  console.log(
    `📬 Reservation notified: ${nextReservation.student.name} → ${nextReservation.book.title}`,
  );
  return nextReservation;
};

//  Auto-expire reservation (called by cron)

const expireReservations = async () => {
  // Capture exactly which reservations are expiring in THIS run before
  // updating them, so we don't reprocess reservations expired by earlier runs.
  const dueToExpire = await prisma.reservation.findMany({
    where: {
      status: "NOTIFIED",
      expiresAt: { lt: new Date() },
    },
    select: { id: true, bookId: true },
  });

  if (dueToExpire.length === 0) return 0;

  await prisma.reservation.updateMany({
    where: { id: { in: dueToExpire.map((r) => r.id) } },
    data: { status: "EXPIRED" },
  });

  console.log(`⏰ Expired ${dueToExpire.length} reservation(s)`);

  const uniqueBookIds = [...new Set(dueToExpire.map((r) => r.bookId))];
  for (const bookId of uniqueBookIds) {
    await checkAndNotifyReservation(bookId);
  }

  return dueToExpire.length;
};

module.exports = { checkAndNotifyReservation, expireReservations };
