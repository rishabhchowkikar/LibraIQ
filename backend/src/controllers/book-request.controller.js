const prisma = require("../config/database");
const { createNotification } = require("../services/notification.service");
const { createLog } = require("../services/audit.service");

// POST /api/book-requests (Student)
exports.createRequest = async (req, res) => {
  try {
    const { title, author, genre, reason } = req.body;
    const studentId = req.user.userId;

    if (!title || !author) {
      return res.status(400).json({
        success: false,
        error: "title and author are required",
      });
    }

    const request = await prisma.bookRequest.create({
      data: { studentId, title, author, genre, reason },
    });

    await createLog({
      action: "BOOK_REQUEST_CREATED",
      actorId: studentId,
      actorRole: "STUDENT",
      targetType: "BOOK_REQUEST",
      targetId: request.id,
      details: { title, author, genre },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: "book request submitted successfully ",
      request,
    });
  } catch (error) {
    console.error("Create book request error:", error);
    res.status(500).json({ success: false, error: "Failed to submit request" });
  }
};

// GET /api/book-requests/my-requests (Student)
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await prisma.bookRequest.findMany({
      where: { studentId: req.user.userId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, requests });
  } catch (error) {
    console.error("Get my requests error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch requests" });
  }
};

// GET /api/book-requests (Admin)
exports.getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const [requests, pendingCount] = await Promise.all([
      prisma.bookRequest.findMany({
        where,
        include: {
          student: {
            select: { id: true, name: true, email: true, trustTier: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.json({ success: true, requests, pendingCount });
  } catch (error) {
    console.error("Get all requests error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch requests" });
  }
};

// PATCH /api/book-requests/:id/approve (Admin)

exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;
    const adminId = req.user.userId;

    const existing = await prisma.bookRequest.findUnique({ where: { id } });
    if (!existing) {
      return res
        .status(400)
        .json({ success: false, error: "Request not found" });
    }
    if (existing.status !== "PENDING") {
      return res
        .status(400)
        .json({ success: false, error: "Request Already Reviewd" });
    }

    const request = await prisma.bookRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        adminNote: adminNote || null,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // Notify student
    await createNotification({
      userId: existing.studentId,
      type: "BOOK_REQUEST_UPDATE",
      message: `✅ Your request for "${existing.title}" by ${existing.author} has been approved!${adminNote ? ` Note: ${adminNote}` : ""}`,
    });

    // Audit log
    await createLog({
      action: "BOOK_REQUEST_APPROVED",
      actorId: adminId,
      actorRole: "ADMIN",
      targetType: "BOOK_REQUEST",
      targetId: id,
      details: {
        title: existing.title,
        student: existing.studentId,
        adminNote,
      },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: "Request approved successfully",
      request,
    });
  } catch (error) {
    console.error("Approve request error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to approve request" });
  }
};

// PATCH /api/book-requests/:id/reject (Admin)
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;
    const adminId = req.user.userId;

    if (!adminNote || adminNote.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: "A reason of at least 5 characters is required when rejecting",
      });
    }

    const existing = await prisma.bookRequest.findUnique({ where: { id } });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, error: "Request not found" });
    }
    if (existing.status !== "PENDING") {
      return res
        .status(400)
        .json({ success: false, error: "Request already reviewed" });
    }

    const request = await prisma.bookRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        adminNote,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // notify student
    await createNotification({
      userId: existing.studentId,
      type: "BOOK_REQUEST_UPDATE",
      message: `❌ Your request for "${existing.title}" was not approved. Reason: ${adminNote}`,
    });

    // Audit log
    await createLog({
      action: "BOOK_REQUEST_REJECTED",
      actorId: adminId,
      actorRole: "ADMIN",
      targetType: "BOOK_REQUEST",
      targetId: id,
      details: {
        title: existing.title,
        student: existing.studentId,
        adminNote,
      },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: "Request rejected",
      request,
    });
  } catch (error) {
    console.error("Reject request error:", error);
    res.status(500).json({ success: false, error: "Failed to reject request" });
  }
};
