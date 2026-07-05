const prisma = require("../config/database");
const { createLog } = require("../services/audit.service");
const {
  checkAndNotifyReservation,
} = require("../services/reservation.service");
// Helper: Calculate due date based on trust tier
const calculateDueDate = (trustTier) => {
  const daysMap = {
    BRONZE: 14,
    SILVER: 21,
    GOLD: 28,
    PLATINUM: 30,
  };

  const days = daysMap[trustTier] || 14;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate;
};

// Issue a book (Admin only)
exports.issueBook = async (req, res, next) => {
  try {
    const { studentId, bookId } = req.body;

    if (!studentId || !bookId) {
      return res.status(400).json({
        success: false,
        error: "Student ID and Book ID are required",
      });
    }

    // Get Student
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        loans: {
          where: { status: "ACTIVE" },
        },
        fines: {
          where: { paidAt: null },
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: "Student not found",
      });
    }

    if (student.role !== "STUDENT") {
      return res.status(400).json({
        success: false,
        error: "Only students can borrow books",
      });
    }

    // Check for unpaid fines
    if (student.fines.length > 0) {
      const totalFines = student.fines.reduce(
        (sum, fine) => sum + fine.amount,
        0,
      );
      return res.status(403).json({
        success: false,
        error: `Cannot issue book. Unpaid fines: ₹${totalFines}`,
      });
    }

    // Check loan limit based on trust tier
    const loanLimits = {
      BRONZE: 1,
      SILVER: 2,
      GOLD: 3,
      PLATINUM: 4,
    };

    const maxLoans = loanLimits[student.trustTier] || 1;

    if (student.loans.length >= maxLoans) {
      return res.status(403).json({
        success: false,
        error: `Maximum ${maxLoans} active loans allowed for ${student.trustTier} tier`,
      });
    }

    // Get book
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        error: "Book not found",
      });
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        error: "Book is currently unavailable",
      });
    }

    // Create loan and update book
    const [loan] = await prisma.$transaction([
      prisma.loan.create({
        data: {
          studentId,
          bookId,
          dueDate: calculateDueDate(student.trustTier),
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              trustTier: true,
            },
          },
          book: true,
        },
      }),
      prisma.book.update({
        where: { id: bookId },
        data: {
          availableCopies: {
            decrement: 1,
          },
        },
      }),
    ]);

    await createLog({
      action: "LOAN_ISSUED",
      actorId: req.user.userId,
      actorRole: "ADMIN",
      targetType: "LOAN",
      targetId: loan.id,
      details: {
        bookTitle: loan.book.title,
        studentName: loan.student.name,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: "Book issued successfully",
      loan,
    });
  } catch (error) {
    console.error("Issue book error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to issue book",
    });
  }
};

// Return a book (Admin only)
exports.returnBook = async (req, res) => {
  try {
    const { loanId } = req.body;
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        book: true,
      },
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: "Loan not found",
      });
    }

    if (loan.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        error: "Loan is not active",
      });
    }

    const returnDate = new Date();
    const isOverdue = returnDate > loan.dueDate;

    // Calculate fine if overdue
    let fine = null;
    if (isOverdue) {
      const daysOverdue = Math.ceil(
        (returnDate - loan.dueDate) / (1000 * 60 * 60 * 24),
      );
      const fineAmount = daysOverdue * 5; // ₹5 per day

      fine = await prisma.fine.create({
        data: {
          loanId: loan.id,
          studentId: loan.studentId,
          amount: Math.min(fineAmount, 200), // Cap at ₹200
          reason: `Overdue by ${daysOverdue} days`,
        },
      });
    }
    // update loan and boook
    const [updatedLoan] = await prisma.$transaction([
      prisma.loan.update({
        where: { id: loanId },
        data: {
          returnedAt: returnDate,
          status: isOverdue ? "OVERDUE" : "RETURNED",
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          book: true,
          fines: true,
        },
      }),
      prisma.book.update({
        where: { id: loan.bookId },
        data: {
          availableCopies: {
            increment: 1,
          },
        },
      }),
    ]);

    await checkAndNotifyReservation(loan.bookId);

    await createLog({
      action: "LOAN_RETURNED",
      actorId: req.user.userId,
      actorRole: req.user.role,
      targetType: "LOAN",
      targetId: loanId,
      details: {
        bookTitle: loan.book.title,
        wasOverdue: isOverdue,
        fineAmount: fine ? fine.amount : 0,
      },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: isOverdue
        ? `Book Returned with fine of ${fine.amount}`
        : "Book returned successfully",
      loan: updatedLoan,
    });
  } catch (error) {
    console.error("Return book error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to return book",
    });
  }
};

// Get all loans (with filters)

exports.getAllLoans = async (req, res) => {
  try {
    const { studentId, status } = req.query;
    const where = {};

    if (studentId) {
      where.studentId = studentId;
    }

    if (status) {
      where.status = status;
    }

    const loans = await prisma.loan.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            trustTier: true,
          },
        },
        book: true,
        fines: true,
      },
      orderBy: {
        issuedAt: "desc",
      },
    });

    res.json({
      success: true,
      count: loans.length,
      loans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch loans",
    });
  }
};

// Get student's loans
exports.getMyLoans = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const loans = await prisma.loan.findMany({
      where: { studentId },
      include: {
        book: true,
        fines: true,
      },
      orderBy: {
        issuedAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      count: loans.length,
      loans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch loans",
    });
  }
};

exports.markAsLost = async (req, res, next) => {
  try {
    const { loanId, replacementCost } = req.body;

    if (!loanId) {
      return res.status(400).json({
        success: false,
        error: "Loan id is required",
      });
    }

    const cost = parseFloat(replacementCost) || 500;

    // Get loan with details;

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        student: true,
        book: true,
        fines: { where: { paidAt: null, waivedBy: null } },
      },
    });

    if (!loan) {
      return rs.status(404).json({
        success: false,
        error: "Loan not found",
      });
    }

    if (loan.status === "RETURNED") {
      return res.status(400).json({
        success: false,
        error: "Loan is already marked as lost",
      });
    }

    // Run all updates in a transaction
    const [updatedLoan, fine] = await prisma.$transaction(async (tx) => {
      // 1. Mark loan as lost
      const updated = await tx.loan.update({
        where: { id: loanId },
        data: { status: "LOST" },
        include: {
          student: { select: { id: true, name: true, email: true } },
          book: true,
        },
      });

      // 2. Waive any existing  overdue fines
      if (loan.fines.length > 0) {
        await tx.fine.updateMany({
          where: { loanId, paidAt: null, waivedBy: null },
          data: {
            waivedBy: req.user.userId,
            reason: "Overdue fine voided - book reported lost",
          },
        });
      }

      // 3. create replacement fine
      const newFine = await tx.fine.create({
        data: {
          loanId,
          studentId: loan.studentId,
          amount: cost,
          reason: `Book lost- replacement cost for '${loan.book.title}'`,
        },
      });

      // 4. Decrement book tootal copies
      await tx.book.update({
        where: { id: loan.bookId },
        data: {
          totalCopies: { decrement: 1 },
        },
      });

      return [updated, newFine];
    });

    // Send email notification

    const { sendEmail } = require("../services/email.service");

    await sendEmail({
      to: loan.student.email,
      subject: `Book Marked as Lost - ${loan.book.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
            .header { background: #dc2626; padding: 28px 36px; }
            .header h1 { color: white; margin: 0; font-size: 22px; }
            .body { padding: 28px 36px; }
            .book-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }
            .amount { font-size: 32px; font-weight: 700; color: #dc2626; text-align: center; padding: 16px; }
            .footer { background: #f9fafb; padding: 16px 36px; border-top: 1px solid #e5e7eb; text-align: center; }
            p { color: #374151; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📕 LibraIQ — Lost Book Notice</h1>
            </div>
            <div class="body">
              <p>Hi <strong>${loan.student.name.split(" ")[0]}</strong>,</p>
              <p>The following book from your account has been reported as <strong>lost</strong>.</p>

              <div class="book-card">
                <strong>${loan.book.title}</strong>
                <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">by ${loan.book.author}</p>
              </div>

              <p>A replacement fine has been applied to your account:</p>
              <div class="amount">₹${cost}</div>

              <p>Please visit the library to settle this amount. Your account is <strong>blocked from new loans</strong> until this is cleared.</p>
              <p style="color: #6b7280; font-size: 14px;">If you believe this is an error, please speak to a librarian.</p>
            </div>
            <div class="footer">
              <p style="color: #9ca3af; font-size: 12px;">LibraIQ — Intelligent Library Management</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }).catch((err) =>
      console.warn(`Failed to send lost book email: ${err.message}`),
    );

    // In-app notification
    const { createNotification } = require("../services/notification.service");
    await createNotification({
      userId: loan.studentId,
      type: "GENERAL",
      message: `"${loan.book.title}" has been marked as lost. A replacement fine of ₹${cost} has been added to your account.`,
    });

    await createLog({
      action: "LOAN_MARKED_LOST",
      actorId: req.user.userId,
      actorRole: "ADMIN",
      targetType: "LOAN",
      targetId: loanId,
      details: {
        bookTitle: loan.book.title,
        studentName: loan.student.name,
        replacementCost: cost,
      },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Loan marked as lost. Replacement fine of ${cost} applied.`,
      loan: updatedLoan,
      fine,
    });
  } catch (err) {
    console.error(`Mark lost error ${err.message}`);
    res.status(500).json({
      success: false,
      error: "Failed to mark loan as lost",
    });
  }
};
