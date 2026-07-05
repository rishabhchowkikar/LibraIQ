const prisma = require("../config/database");
const { createNotification } = require("../services/notification.service");
const { createLog } = require("../services/audit.service");

// POST /api/reservations (student)
exports.createReservation = async (req, res) => {
  try {
    const { bookId } = req.body;
    const studentId = req.user.userId;

    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });
    if (!book) {
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    }

    // book must be unavailable to reserve
    if (book.availableCopies > 0) {
      return res.status(400).json({
        success: false,
        message: "Book is available for borrowing. No need to reserve.",
      });
    }

    // check student doesn't already have active reservation
    const existingReservation = await prisma.reservation.findFirst({
      where: { studentId, bookId, status: { in: ["PENDING", "NOTIFIED"] } },
    });

    if (existingReservation) {
      return res.status(400).json({
        success: false,
        error: "You already have an active reservation for this book",
      });
    }

    // check student doesnot already have the book on loan
    const activeLoan = await prisma.loan.findFirst({
      where: { studentId, bookId, status: "ACTIVE" },
    });

    if (activeLoan) {
      return res.status(400).json({
        success: false,
        error: "You already have this book on loan",
      });
    }

    // get queue postion
    const queuePosition = await prisma.reservation.count({
      where: { bookId, status: { in: ["PENDING", "NOTIFIED"] } },
    });

    const reservation = await prisma.reservation.create({
      data: {
        studentId,
        bookId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      include: {
        book: { select: { title: true, author: true } },
      },
    });

    await createNotification({
      userId: studentId,
      type: "RESERVATION_AVAILABLE",
      message: `📋 You are #${queuePosition + 1} in queue for "${book.title}". We'll notify you when it's available!`,
    });

    await createLog({
      action: "RESERVATION_CREATED",
      actorId: studentId,
      actorRole: "STUDENT",
      targetType: "RESERVATION",
      targetId: reservation.id,
      details: {
        bookTitle: book.title,
        queuePostion: queuePosition + 1,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: `Reservation created! You are #${queuePosition + 1} in queue.`,
      reservation,
      queuePosition: queuePosition + 1,
    });
  } catch (error) {
    console.error("Create reservation error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to create reservation" });
  }
};

// GET /api/reservations/my-reservation (student)
exports.getMyReservations = async (req, res) => {
  try {
    const reservation = await prisma.reservation.findMany({
      where: { studentId: req.user.userId },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            genre: true,
            coverUrl: true,
          },
        },
      },
      orderBy: { reservedAt: "desc" },
    });
    res.json({ success: true, reservation });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "failed to fetch reservation" });
  }
};

// DELETE /api/reservation/:id (student cancel)
exports.cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.userId;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { book: true },
    });

    if (!reservation || reservation.studentId !== studentId) {
      return res
        .status(404)
        .json({ success: false, error: "Reservation not found" });
    }

    if (!["PENDING", "NOTIFIED"].includes(reservation.status)) {
      return res.status(400).json({
        success: false,
        error: "Cannot cancel this reservation",
      });
    }

    await prisma.reservation.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    res.json({
      success: true,
      message: "Rerservation cancelled successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to cancel reservation" });
  }
};

// GET /api/reservation (admin)
exports.getAllReservations = async (req, res) => {
  try {
    const { status, bookId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (bookId) where.bookId = bookId;

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        student: {
          select: { id: true, name: true, email: true, trustTier: true },
        },
        book: { select: { id: true, title: true, author: true } },
      },
      orderBy: { reservedAt: "asc" },
    });

    res.json({ success: true, reservations });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch reservations" });
  }
};
