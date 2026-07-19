const {
  getReadingStats,
  checkAchievements,
  getOrCreateGoal,
  updateGoal,
  getLeaderboard,
  ACHIEVEMENTS,
} = require("../services/reading-stats.service");

const prisma = require("../config/database");

// GET /api/reading-stats (Student)
exports.getStats = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const [stats, goal, achievements, user] = await Promise.all([
      getReadingStats(studentId),
      getOrCreateGoal(studentId),
      prisma.achievement.findMany({
        where: { studentId },
        orderBy: { earnedAt: "desc" },
      }),
      prisma.user.findUnique({
        where: { id: studentId },
        select: { showOnLeaderboard: true },
      }),
    ]);

    // check for new achievements
    const newAchievements = await checkAchievements(studentId);

    // get current month book count
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const booksThisMonth = await prisma.loan.count({
      where: {
        studentId,
        issuedAt: { gte: monthStart },
      },
    });

    const enrichedAchievements = achievements.map((a) => ({
      ...a,
      ...ACHIEVEMENTS[a.type],
    }));

    res.json({
      success: true,
      stats,
      goal: {
        ...goal,
        booksThisMonth,
        monthlyProgress: Math.min(
          100,
          Math.round((booksThisMonth / goal.monthlyGoal) * 100),
        ),
        yearlyProgress: Math.min(
          100,
          Math.round((stats.booksThisYear / goal.yearlyGoal) * 100),
        ),
      },
      achievements: enrichedAchievements,
      newAchievements,
      showOnLeaderboard: user.showOnLeaderboard,
    });
  } catch (error) {
    console.error("Reading stats error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch reading stats" });
  }
};

// PUT /api/reading-stats/goal (Student)

exports.updateGoal = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { monthlyGoal, yearlyGoal } = req.body;

    if (monthlyGoal < 1 || yearlyGoal < 1) {
      return res
        .status(400)
        .json({ success: false, error: "Goals must be at least 1" });
    }

    const goal = await updateGoal(studentId, { monthlyGoal, yearlyGoal });
    res.json({ success: true, goal });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update goal" });
  }
};

// GET /api/reading-stats/achievements (Student)
exports.getAchievements = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const achievements = await prisma.achievement.findMany({
      where: { studentId },
      orderBy: { earnedAt: "desc" },
    });

    const enriched = achievements.map((a) => ({
      ...a,
      ...ACHIEVEMENTS[a.type],
    }));

    // Mark all as seen
    await prisma.achievement.updateMany({
      where: { studentId, seen: false },
      data: { seen: true },
    });

    res.json({ success: true, achievements: enriched });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch achievements" });
  }
};

// GET /api/reading-stats/leaderboard (Student)
exports.getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json({ success: true, leaderboard });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch leaderboard" });
  }
};

// PATCH /api/reading-stats/leaderboard-visibility (Student)
exports.updateLeaderboardVisibility = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { showOnLeaderboard } = req.body;

    const user = await prisma.user.update({
      where: { id: studentId },
      data: { showOnLeaderboard: !!showOnLeaderboard },
      select: { showOnLeaderboard: true },
    });

    res.json({ success: true, showOnLeaderboard: user.showOnLeaderboard });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to update leaderboard visibility" });
  }
};
