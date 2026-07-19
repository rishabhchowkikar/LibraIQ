const express = require("express");
const readingStatsRouter = express.Router();
const readingStatsController = require("../controllers/reading-stats.controller");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roleCheck");

readingStatsRouter.get(
  "/",
  authenticate,
  requireRole("STUDENT"),
  readingStatsController.getStats,
);
readingStatsRouter.put(
  "/goal",
  authenticate,
  requireRole("STUDENT"),
  readingStatsController.updateGoal,
);
readingStatsRouter.get(
  "/achievements",
  authenticate,
  requireRole("STUDENT"),
  readingStatsController.getAchievements,
);
readingStatsRouter.get(
  "/leaderboard",
  authenticate,
  requireRole("STUDENT"),
  readingStatsController.getLeaderboard,
);
readingStatsRouter.patch(
  "/leaderboard-visibility",
  authenticate,
  requireRole("STUDENT"),
  readingStatsController.updateLeaderboardVisibility,
);

module.exports = readingStatsRouter;
