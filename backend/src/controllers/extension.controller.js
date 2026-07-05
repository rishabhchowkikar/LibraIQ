const prisma = require("../config/database");
const { createNotification } = require("../services/notification.service");
const { createLog } = require("../services/audit.service");

// POST /api/extensions (Student requests extension)
exports.requestExtension = async (req, res) => {
  try {
    const { loanId } = req.body;
    const studentId = req.user.userId;

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        book: true,
        extensions: true,
      },
    });

    if (!loan || loan.studentId !== studentId) {
      return res.status(404).json({ success: false, error: "Loan not found" });
    }

    if (loan.status !== "ACTIVE") {
      return res
        .status(400)
        .json({ success: false, error: "Loan is not active" });
    }

    // Max 1 extension per loan
    if (loan.extensions.length > 0) {
      return res.status(400).json({
        success: false,
        error: "You have already used your extension for this loan",
      });
    }

    // Check no one has reserved this book
    const hasReservation = await prisma.reservation.findFirst({
      where: {
        bookId: loan.bookId,
        status: { in: ["PENDING", "NOTIFIED"] },
      },
    });

    if (hasReservation) {
      return res.status(400).json({
        success: false,
        error: "Cannot extend — another student has reserved this book",
      });
    }

    // Check no pending extension already
    const pendingExtension = loan.extensions.find(
      (e) => e.status === "PENDING",
    );
    if (pendingExtension) {
      return res.status(400).json({
        success: false,
        error: "You already have a pending extension request",
      });
    }

    // New due date = current due date + 7 days
    const newDueDate = new Date(loan.dueDate);
    newDueDate.setDate(newDueDate.getDate() + 7);

    const extension = await prisma.loanExtension.create({
      data: {
        loanId,
        studentId,
        newDueDate,
      },
      include: {
        loan: { include: { book: true } },
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true },
    });

    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: "GENERAL",
        message: `📅 Extension requested for "${loan.book.title}" by student`,
      });
    }

    res.status(201).json({
      success: true,
      message: "Extension request submitted — awaiting admin approval",
      extension,
      newDueDate,
    });
  } catch (error) {
    console.error("Extension request error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to request extension" });
  }
};

// GET /api/extensions (Admin — all requests)
exports.getAllExtensions = async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const extensions = await prisma.loanExtension.findMany({
      where,
      include: {
        loan: {
          include: {
            book: { select: { title: true, author: true } },
          },
        },
        student: {
          select: { id: true, name: true, email: true, trustTier: true },
        },
      },
      orderBy: { requestedAt: "desc" },
    });

    const pendingCount = await prisma.loanExtension.count({
      where: { status: "PENDING" },
    });

    res.json({ success: true, extensions, pendingCount });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch extensions" });
  }
};

// GET /api/extensions/my-extensions (Student)
exports.getMyExtensions = async (req, res) => {
  try {
    const extensions = await prisma.loanExtension.findMany({
      where: { studentId: req.user.userId },
      include: {
        loan: {
          include: {
            book: { select: { title: true, author: true } },
          },
        },
      },
      orderBy: { requestedAt: "desc" },
    });

    res.json({ success: true, extensions });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch extensions" });
  }
};

// PATCH /api/extensions/:id/approve (Admin)
exports.approveExtension = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;
    const adminId = req.user.userId;

    const extension = await prisma.loanExtension.findUnique({
      where: { id },
      include: {
        loan: { include: { book: true } },
        student: true,
      },
    });

    if (!extension) {
      return res
        .status(404)
        .json({ success: false, error: "Extension not found" });
    }

    if (extension.status !== "PENDING") {
      return res
        .status(400)
        .json({ success: false, error: "Already reviewed" });
    }

    // Update extension + loan due date in transaction
    await prisma.$transaction([
      prisma.loanExtension.update({
        where: { id },
        data: {
          status: "APPROVED",
          adminNote,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      }),
      prisma.loan.update({
        where: { id: extension.loanId },
        data: {
          dueDate: extension.newDueDate,
          extendedCount: { increment: 1 },
        },
      }),
    ]);

    await createNotification({
      userId: extension.studentId,
      type: "GENERAL",
      message: `✅ Your extension for "${extension.loan.book.title}" was approved! New due date: ${extension.newDueDate.toLocaleDateString("en-IN")}`,
    });

    await createLog({
      action: "EXTENSION_APPROVED",
      actorId: adminId,
      actorRole: "ADMIN",
      targetType: "LOAN",
      targetId: extension.loanId,
      details: { newDueDate: extension.newDueDate },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: "Extension approved" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to approve extension" });
  }
};

// PATCH /api/extensions/:id/reject (Admin)
exports.rejectExtension = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;
    const adminId = req.user.userId;

    if (!adminNote) {
      return res
        .status(400)
        .json({ success: false, error: "Reason is required" });
    }

    const extension = await prisma.loanExtension.findUnique({
      where: { id },
      include: { loan: { include: { book: true } } },
    });

    if (!extension) {
      return res
        .status(404)
        .json({ success: false, error: "Extension not found" });
    }

    await prisma.loanExtension.update({
      where: { id },
      data: {
        status: "REJECTED",
        adminNote,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    await createNotification({
      userId: extension.studentId,
      type: "GENERAL",
      message: `❌ Your extension for "${extension.loan.book.title}" was not approved. Reason: ${adminNote}`,
    });

    res.json({ success: true, message: "Extension rejected" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to reject extension" });
  }
};
