const express = require("express");
const aiRouter = express.Router();
const aiController = require("../controllers/ai.controller");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roleCheck");

// status check
aiRouter.get("/status", authenticate, aiController.getStatus);

// student routes
aiRouter.get(
  "/recommendations",
  authenticate,
  requireRole("STUDENT"),
  aiController.getRecommendations,
);

aiRouter.get(
  "/score-explanation",
  authenticate,
  requireRole("STUDENT"),
  aiController.getScoreExplanation,
);

aiRouter.get(
  "/genre-dna",
  authenticate,
  requireRole("STUDENT"),
  aiController.getGenreDNA,
);

// admin routes
aiRouter.get(
  "/student-summary/:studentId",
  authenticate,
  requireRole("ADMIN"),
  aiController.getStudentSummary,
);

module.exports = aiRouter;
