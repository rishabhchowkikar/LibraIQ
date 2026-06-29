const prisma = require("../config/database");

// ─── Overview Stats ───────────────────────────────────────────
const getOverviewStats = async () => {
  const [
    totlaStudents,
    totalBooks,
    totalLoans,
    activeLoans,
    overdueLoans,
    totalFinesResult,
    unpaidFineResult,
    totalRevenueResult,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT", isActive: true } }),
    prisma.book.count(),
    prisma.loan.count(),
    prisma.loan.count({ where: { status: "ACTIVE" } }),
    prisma.loan.count({ where: { status: "OVERDUE" } }),
    prisma.fine.aggregate({ _sum: { amount: true } }),
    prisma.fine.aggregate({
      where: { paidAt: null, waivedBy: null },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
    }),
  ]);

  // most borrowed book
  const topBookGroup = await prisma.loan.groupBy({
    by: ["bookId"],
    _count: { bookId: true },
    orderBy: { _count: { bookId: "desc" } },
    take: 1,
  });

  let mostBorrowedBook = null;

  if (topBookGroup.length > 0) {
    mostBorrowedBook = await prisma.book.findUnique({
      where: { id: topBookGroup[0].bookId },
      select: { title: true, author: true },
    });
  }

  // most active student
  const topStudentGroup = await prisma.loan.groupBy({
    by: ["studentId"],
    _count: { studentId: true },
    orderBy: { _count: { studentId: "desc" } },
    take: 1,
  });

  let mostActiveStudent = null;
  if (topStudentGroup.length > 0) {
    mostActiveStudent = await prisma.user.findUnique({
      where: { id: topStudentGroup[0].studentId },
      select: { name: true, email: true },
    });
  }

  // on-time return percentage
  const returnedloans = await prisma.loan.count({
    where: { status: "RETURNED" },
  });
  const lateLoans = await prisma.loan.count({
    where: {
      status: "RETURNED",
      fines: { some: { reason: { contains: "Overdue" } } },
    },
  });

  const onTimePercent =
    returnedloans > 0
      ? Math.round(((returnedloans - lateLoans) / returnedloans) * 100)
      : 100;

  // pending book requests
  const pendingRequests = await prisma.bookRequest.count({
    where: { status: "PENDING" },
  });

  return {
    totlaStudents,
    totalBooks,
    totalLoans,
    activeLoans,
    overdueLoans,
    totalFines: totalFinesResult._sum.amount || 0,
    unpaidFines: unpaidFineResult._sum.amount || 0,
    totalRevenue: totalRevenueResult._sum.amount || 0,
    mostBorrowedBook,
    mostActiveStudent,
    onTimePercent,
    pendingRequests,
  };
};

// ─── Loans Trend (last 6 months) ─────────────────────────────
const getLoansTrend = async () => {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: date.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      }),
    });
  }

  const results = await Promise.all(
    months.map(async ({ year, month, label }) => {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);

      const [total, returned, overdue, lost] = await Promise.all([
        prisma.loan.count({
          where: { issuedAt: { gte: start, lt: end } },
        }),
        prisma.loan.count({
          where: { issuedAt: { gte: start, lt: end }, status: "RETURNED" },
        }),
        prisma.loan.count({
          where: { issuedAt: { gte: start, lt: end }, status: "OVERDUE" },
        }),
        prisma.loan.count({
          where: { issuedAt: { gte: start, lt: end }, status: "LOST" },
        }),
      ]);
      return { label, total, returned, overdue, lost };
    }),
  );

  return results;
};

// ─── Revenue Trend (last 6 months) ───────────────────────────
const getRevenueTrend = async () => {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: date.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      }),
    });
  }

  const results = await Promise.all(
    months.map(async ({ year, month, label }) => {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);

      const [online, cash, link] = await Promise.all([
        prisma.payment.aggregate({
          where: {
            status: "SUCCESS",
            method: "ONLINE",
            paidAt: { gte: start, lt: end },
          },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: {
            status: "SUCCESS",
            method: "CASH",
            paidAt: { gte: start, lt: end },
          },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: {
            status: "SUCCESS",
            method: "LINK",
            paidAt: { gte: start, lt: end },
          },
          _sum: { amount: true },
        }),
      ]);

      const onlineAmt = online._sum.amount || 0;
      const cashAmt = cash._sum.amount || 0;
      const linkAmt = link._sum.amount || 0;

      return {
        label,
        online: onlineAmt,
        cash: cashAmt,
        link: linkAmt,
        total: onlineAmt + cashAmt + linkAmt,
      };
    }),
  );
  return results;
};

// ─── Top 10 Most Borrowed Books ───────────────────────────────
const getTopBooks = async () => {
  const topBooks = await prisma.loan.groupBy({
    by: ["bookId"],
    _count: { bookId: true },
    orderBy: { _count: { bookId: "desc" } },
    take: 10,
  });

  const books = await Promise.all(
    topBooks.map(async (item) => {
      const book = await prisma.book.findUnique({
        where: { id: item.bookId },
        select: { title: true, author: true, genre: true },
      });
      if (!book) return null;
      return { ...book, loanCount: item._count.bookId };
    }),
  );
  return books.filter(Boolean);
};

// ─── Tier Distribution ────────────────────────────────────────
const getTierDistribution = async () => {
  const tiers = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];

  const results = await Promise.all(
    tiers.map(async (tier) => {
      const count = await prisma.user.count({
        where: { role: "STUDENT", isActive: true, trustTier: tier },
      });
      return { tier, count };
    }),
  );

  return results;
};

// ─── Score Distribution ───────────────────────────────────────
const getScoreDistribution = async () => {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", isActive: true },
    select: { id: true },
  });

  const { computeStudentScore } = require("./reader-score.service");

  const ranges = {
    "0-20": 0,
    "21-40": 0,
    "41-60": 0,
    "61-80": 0,
    "81-100": 0,
  };

  for (const student of students) {
    try {
      const { score } = await computeStudentScore(student.id);
      if (score <= 20) ranges["0-20"]++;
      else if (score <= 40) ranges["21-40"]++;
      else if (score <= 60) ranges["41-60"]++;
      else if (score <= 80) ranges["61-80"]++;
      else ranges["81-100"]++;
    } catch (error) {
      console.log("error in the getscore distribution logic ", error.message);
    }
  }
  return Object.entries(ranges).map(([range, count]) => ({ range, count }));
};

// ─── Fine Trend (last 6 months) ──────────────────────────────
const getFineTrend = async () => {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: date.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      }),
    });
  }

  const results = await Promise.all(
    months.map(async ({ year, month, label }) => {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);

      const [paid, waived, outstanding] = await Promise.all([
        prisma.fine.aggregate({
          where: { paidAt: { gte: start, lt: end } },
          _sum: { amount: true },
        }),
        prisma.fine.aggregate({
          where: {
            waivedBy: { not: null },
            createdAt: { gte: start, lt: end },
          },
          _sum: { amount: true },
        }),
        prisma.fine.aggregate({
          where: {
            paidAt: null,
            waivedBy: null,
            createdAt: { gte: start, lt: end },
          },
          _sum: { amount: true },
        }),
      ]);

      return {
        label,
        paid: paid._sum.amount || 0,
        waived: waived._sum.amount || 0,
        outstanding: outstanding._sum.amount || 0,
      };
    }),
  );

  return results;
};

module.exports = {
  getOverviewStats,
  getLoansTrend,
  getRevenueTrend,
  getTopBooks,
  getTierDistribution,
  getScoreDistribution,
  getFineTrend,
};
