const prisma = require("../config/database");
const { createNotification } = require("../services/notification.service");
const {
  sendFineWaivedEmail,
  sendFinePaidEmail,
} = require("../services/email.service");

// GET /api/fines — All fines (admin)
exports.getAllFines = async (req, res) => {
  try {
    const { status, studentId } = req.query;

    const where = {};
    if (studentId) where.studentId = studentId;
    if (status === "unpaid") {
      where.paidAt = null;
      where.waivedBy = null;
    }
    if (status === "paid") where.paidAt = { not: null };
    if (status === "waived") where.waivedBy = { not: null };

    const fines = await prisma.fine.findMany({
      where,
      include: {
        student: {
          select: { id: true, name: true, email: true, trustTier: true },
        },
        loan: {
          include: {
            book: {
              select: { id: true, title: true, author: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate summary
    const unpaid = fines.filter((f) => !f.paidAt && !f.waivedBy);
    const totalOutstanding = unpaid.reduce((sum, f) => sum + f.amount, 0);
    const totalCollected = fines
      .filter((f) => f.paidAt)
      .reduce((sum, f) => sum + f.amount, 0);

    res.status(200).json({
      success: true,
      fines,
      summary: {
        total: fines.length,
        unpaidCount: unpaid.length,
        totalOutstanding,
        totalCollected,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch fines" });
  }
};

// GET /api/fines/my-fines — Student's own fines
exports.getMyFines = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const fines = await prisma.fine.findMany({
      where: { studentId },
      include: {
        loan: {
          include: {
            book: {
              select: { id: true, title: true, author: true, coverUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const unpaid = fines.filter((f) => !f.paidAt && !f.waivedBy);
    const totalOutstanding = unpaid.reduce((sum, f) => sum + f.amount, 0);

    res.json({
      success: true,
      fines,
      summary: {
        unpaidCount: unpaid.length,
        totalOutstanding,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch fines" });
  }
};

// POST /api/fines/:id/pay — Mark fine as paid (admin)
// exports.markAsPaid = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const fine = await prisma.fine.findUnique({
//       where: { id },
//       include: {
//         student: true,
//         loan: { include: { book: true } },
//       },
//     });

//     if (!fine) {
//       return res.status(404).json({ success: false, error: "Fine not found" });
//     }

//     if (fine.paidAt) {
//       return res
//         .status(400)
//         .json({ success: false, error: "Fine already paid" });
//     }

//     const updatedFine = await prisma.fine.update({
//       where: { id },
//       data: { paidAt: new Date() },
//     });

//     // Email + notification
//     await sendFinePaidEmail({
//       student: fine.student,
//       book: fine.loan.book,
//       amount: fine.amount,
//     }).catch((err) => console.warn("Email failed:", err.message));

//     await createNotification({
//       userId: fine.studentId,
//       type: "FINE_ALERT",
//       message: `Your fine of ₹${fine.amount} for "${fine.loan.book.title}" has been marked as paid. Thank you!`,
//     });

//     res.json({
//       success: true,
//       message: "Fine marked as paid",
//       fine: updatedFine,
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ success: false, error: "Failed to mark fine as paid" });
//   }
// };

exports.markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;

    // ✅ Fix 1: findUnique not findMany
    const fine = await prisma.fine.findUnique({
      where: { id },
      include: {
        student: true,
        loan: { include: { book: true } },
      },
    });

    if (!fine) {
      return res.status(404).json({ success: false, error: "Fine not found" });
    }

    if (fine.paidAt || fine.waivedBy) {
      return res
        .status(400)
        .json({ success: false, error: "Fine already cleared" });
    }

    // ✅ Fix 2: correct spelling generateReceipt
    const { generateReceipt } = require("../services/payment.service");
    const receipt = generateReceipt();

    const [payment] = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          receipt,
          studentId: fine.studentId,
          amount: fine.amount,
          method: "CASH",
          status: "SUCCESS",
          fineIds: [fine.id],
          createdBy: adminId, // ✅ Fix 3: createdBy not createdAt
          paidAt: new Date(),
        },
      });

      await tx.fine.update({
        where: { id },
        data: {
          paidAt: new Date(),
          paymentId: newPayment.id,
          paymentMethod: "CASH",
        },
      });

      return [newPayment];
    });

    const remaining = await prisma.fine.count({
      where: { studentId: fine.studentId, paidAt: null, waivedBy: null },
    });
    const allCleared = remaining === 0;

    const {
      sendPaymentReceiptEmail,
    } = require("../services/payment-email.service");
    await sendPaymentReceiptEmail({
      student: fine.student,
      amount: fine.amount,
      receipt,
      method: "CASH",
      fineCount: 1,
      allCleared,
    }).catch((err) => console.warn("Receipt email failed:", err.message));

    const { createNotification } = require("../services/notification.service");
    await createNotification({
      userId: fine.studentId,
      type: "FINE_ALERT",
      message: allCleared
        ? `🎉 All fines cleared! ₹${fine.amount} cash payment recorded. Receipt: ${receipt}`
        : `✅ Cash payment of ₹${fine.amount} recorded by librarian. Receipt: ${receipt}`,
    });

    console.log(`💵 Cash payment recorded: ${receipt} — ₹${fine.amount}`);

    res.json({
      success: true,
      message: `₹${fine.amount} cash payment recorded successfully`,
      receipt,
      allCleared,
    });
  } catch (error) {
    console.error("Mark paid error:", error);
    res.status(500).json({ success: false, error: "Failed to record payment" });
  }
};

// POST /api/fines/:id/waive — Waive a fine (admin)
exports.waiveFine = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: "A reason of at least 5 characters is required to waive a fine",
      });
    }

    const fine = await prisma.fine.findUnique({
      where: { id },
      include: {
        student: true,
        loan: { include: { book: true } },
      },
    });

    if (!fine) {
      return res.status(404).json({ success: false, error: "Fine not found" });
    }

    if (fine.paidAt) {
      return res
        .status(400)
        .json({ success: false, error: "Cannot waive a paid fine" });
    }

    if (fine.waivedBy) {
      return res
        .status(400)
        .json({ success: false, error: "Fine already waived" });
    }

    const updatedFine = await prisma.fine.update({
      where: { id },
      data: {
        waivedBy: adminId,
        reason: `${fine.reason} | Waived: ${reason}`,
      },
    });

    // Email + notification
    await sendFineWaivedEmail({
      student: fine.student,
      book: fine.loan.book,
      amount: fine.amount,
      reason,
    }).catch((err) => console.warn("Email failed:", err.message));

    await createNotification({
      userId: fine.studentId,
      type: "FINE_ALERT",
      message: `Your fine of ₹${fine.amount} for "${fine.loan.book.title}" has been waived. Reason: ${reason}`,
    });

    res.json({
      success: true,
      message: "Fine waived successfully",
      fine: updatedFine,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to waive fine" });
  }
};
