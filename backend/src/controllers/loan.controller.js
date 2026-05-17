const prisma = require("../config/database");

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
