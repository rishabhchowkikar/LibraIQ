const prisma = require("../config/database");

const ACHIEVEMENTS = {
  FIRST_BOOK: {
    label: "First Chapter",
    desc: "Borrowed your first book",
    emoji: "📖",
  },
  FIVE_BOOKS: { label: "Bookworm", desc: "Borrowed 5 books", emoji: "📚" },
  TEN_BOOKS: { label: "Avid Reader", desc: "Borrowed 10 books", emoji: "🎓" },
  TWENTY_FIVE_BOOKS: {
    label: "Scholar",
    desc: "Borrowed 25 books",
    emoji: "🏛️",
  },
  FIRST_EARLY: {
    label: "Ahead of Schedule",
    desc: "Returned a book early",
    emoji: "⚡",
  },
  NO_FINES: { label: "Clean Record", desc: "No fines ever", emoji: "✨" },
  PLATINUM_TIER: {
    label: "Elite Member",
    desc: "Reached Platinum tier",
    emoji: "💎",
  },
  STREAK_3: {
    label: "Regular Reader",
    desc: "Active 3 months in a row",
    emoji: "🔥",
  },
  STREAK_6: {
    label: "Dedicated Reader",
    desc: "Active 6 months in a row",
    emoji: "🌟",
  },
};

const getReadingStats = async (studentId) => {
  const loans = await prisma.loan.findMany({
    where: { studentId },
    include: {
      book: { select: { title: true, genre: true, author: true } },
      fines: true,
    },
    orderBy: { issuedAt: "desc" },
  });

  const now = new Date();
  const thisYear = now.getFullYear();

  // book this year
  const booksThisYear = loans.filter(
    (l) => new Date(l.issuedAt).getFullYear() === thisYear,
  ).length;

  // currently reading
  const currentlyReading = loans
    .filter((l) => l.status === "ACTIVE")
    .map((l) => ({
      loan: l.id,
      title: l.book.title,
      author: l.book.author,
      dueDate: l.dueDate,
      daysLeft: Math.ceil((new Date(l.dueDate) - now) / (1000 * 60 * 60 * 24)),
    }));

  // Books due soon (within 3 days)
  const dueSoon = currentlyReading.filter(
    (l) => l.daysLeft <= 3 && l.daysLeft >= 0,
  );

  // favorite geners
  const genreCounts = {};
  loans.forEach((l) => {
    genreCounts[l.book.genre] = (genreCounts[l.book.genre] || 0) + 1;
  });
  const favoriteGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre, count]) => ({ genre, count }));

  // Reading streak (consecutive months active)
  const monthsActive = new Set(
    loans.map((l) => {
      const d = new Date(l.issuedAt);
      return `${d.getFullYear()}-${d.getMonth()}`;
    }),
  );

  let streak = 0;
  const checkDate = new Date();
  while (true) {
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}`;
    if (monthsActive.has(key)) {
      streak++;
      checkDate.setMonth(checkDate.getMonth() - 1);
    } else break;
    if (streak > 24) break; // cap at 24
  }

  // Monthly this year breakdown
  const monthlyStats = Array.from({ length: 12 }, (_, i) => {
    const count = loans.filter((l) => {
      const d = new Date(l.issuedAt);
      return d.getFullYear() === thisYear && d.getMonth() === i;
    }).length;
    return {
      month: new Date(thisYear, i).toLocaleDateString("en-IN", {
        month: "short",
      }),
      books: count,
    };
  });

  // All time stats
  const returned = loans.filter((l) => l.status === "RETURNED");
  const earlyReturns = returned.filter((l) => {
    if (!l.returnedAt) return false;
    return new Date(l.returnedAt) < new Date(l.dueDate);
  }).length;

  return {
    totalBooks: loans.length,
    booksThisYear,
    currentlyReading,
    dueSoon,
    favoriteGenres,
    readingStreak: streak,
    monthlyStats,
    earlyReturns,
    onTimeRate:
      returned.length > 0
        ? Math.round((earlyReturns / returned.length) * 100)
        : 100,
  };
};

// Check and award achievements

const checkAchievements = async (studentId) => {
  const loans = await prisma.loan.findMany({ where: { studentId } });
  const fines = await prisma.fine.findMany({ where: { studentId } });
  const user = await prisma.user.findUnique({
    where: { id: studentId },
    select: { trustTier: true },
  });

  const existing = await prisma.achievement.findMany({
    where: { studentId },
    select: { type: true },
  });

  const earned = new Set(existing.map((a) => a.type));
  const toEarn = [];
  const returned = loans.filter((l) => l.status === "RETURNED");

  if (loans.length >= 1 && !earned.has("FIRST_BOOK")) toEarn.push("FIRST_BOOK");
  if (loans.length >= 5 && !earned.has("FIVE_BOOKS")) toEarn.push("FIVE_BOOKS");
  if (loans.length >= 10 && !earned.has("TEN_BOOKS")) toEarn.push("TEN_BOOKS");
  if (loans.length >= 25 && !earned.has("TWENTY_FIVE_BOOKS"))
    toEarn.push("TWENTY_FIVE_BOOKS");
  if (fines.length === 0 && loans.length > 0 && !earned.has("NO_FINES"))
    toEarn.push("NO_FINES");
  if (user?.trustTier === "PLATINUM" && !earned.has("PLATINUM_TIER"))
    toEarn.push("PLATINUM_TIER");

  const earlyReturn = returned.some(
    (l) => l.returnedAt && new Date(l.returnedAt) < new Date(l.dueDate),
  );
  if (earlyReturn && !earned.has("FIRST_EARLY")) toEarn.push("FIRST_EARLY");

  // Reading streak (consecutive months active)
  const monthsActive = new Set(
    loans.map((l) => {
      const d = new Date(l.issuedAt);
      return `${d.getFullYear()}-${d.getMonth()}`;
    }),
  );

  let streak = 0;
  const checkDate = new Date();
  while (streak <= 24) {
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}`;
    if (monthsActive.has(key)) {
      streak++;
      checkDate.setMonth(checkDate.getMonth() - 1);
    } else break;
  }

  if (streak >= 3 && !earned.has("STREAK_3")) toEarn.push("STREAK_3");
  if (streak >= 6 && !earned.has("STREAK_6")) toEarn.push("STREAK_6");

  // Award new achievements
  for (const type of toEarn) {
    await prisma.achievement.create({ data: { studentId, type } });

    const { createNotification } = require("./notification.service");
    await createNotification({
      userId: studentId,
      type: "GENERAL",
      message: `🏆 Achievement unlocked: ${ACHIEVEMENTS[type].emoji} ${ACHIEVEMENTS[type].label} — ${ACHIEVEMENTS[type].desc}`,
    });
  }

  return toEarn;
};

// Get/create reading goal
const getOrCreateGoal = async (studentId) => {
  let goal = await prisma.readingGoal.findUnique({ where: { studentId } });
  if (!goal) {
    goal = await prisma.readingGoal.create({
      data: { studentId },
    });
  }
  return goal;
};

// Update reading goal
const updateGoal = async (studentId, { monthlyGoal, yearlyGoal }) => {
  return prisma.readingGoal.upsert({
    where: { studentId },
    update: { monthlyGoal, yearlyGoal },
    create: { studentId, monthlyGoal, yearlyGoal },
  });
};

// Leaderboard of opted-in students, ranked by books-this-year (tiebreak: streak)
const getLeaderboard = async () => {
  const optedIn = await prisma.user.findMany({
    where: { role: "STUDENT", isActive: true, showOnLeaderboard: true },
    select: { id: true, name: true, trustTier: true },
  });

  const withStats = await Promise.all(
    optedIn.map(async (student) => {
      const stats = await getReadingStats(student.id);
      return {
        id: student.id,
        name: student.name,
        trustTier: student.trustTier,
        booksThisYear: stats.booksThisYear,
        readingStreak: stats.readingStreak,
      };
    }),
  );

  withStats.sort((a, b) =>
    b.booksThisYear !== a.booksThisYear
      ? b.booksThisYear - a.booksThisYear
      : b.readingStreak - a.readingStreak,
  );

  return withStats.map((entry, index) => ({ ...entry, rank: index + 1 }));
};

module.exports = {
  getReadingStats,
  checkAchievements,
  getOrCreateGoal,
  updateGoal,
  getLeaderboard,
  ACHIEVEMENTS,
};
