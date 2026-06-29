const express = require("express");
const analyticRouter = express.Router();
const analyticsController = require("../controllers/analytics.controller");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roleCheck");

analyticRouter.get(
  "/overview",
  authenticate,
  requireRole("ADMIN"),
  analyticsController.getOverview,
);

analyticRouter.get(
  "/loans-trend",
  authenticate,
  requireRole("ADMIN"),
  analyticsController.getLoansTrend,
);

analyticRouter.get(
  "/revenue-trend",
  authenticate,
  requireRole("ADMIN"),
  analyticsController.getRevenueTrend,
);

analyticRouter.get(
  "/top-books",
  authenticate,
  requireRole("ADMIN"),
  analyticsController.getTopBooks,
);

analyticRouter.get(
  "/tier-distribution",
  authenticate,
  requireRole("ADMIN"),
  analyticsController.getTierDistribution,
);

analyticRouter.get(
  "/score-distribution",
  authenticate,
  requireRole("ADMIN"),
  analyticsController.getScoreDistribution,
);

analyticRouter.get(
  "/fine-trend",
  authenticate,
  requireRole("ADMIN"),
  analyticsController.getFineTrend,
);

module.exports = analyticRouter;
