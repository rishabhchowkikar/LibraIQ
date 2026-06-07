const express = require("express");
const scoreRouter = express.Router();
const scoreController = require("../controllers/score.controller");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roleCheck");

// student
scoreRouter.get(
  "/my-score",
  authenticate,
  requireRole("STUDENT"),
  scoreController.getMyScore,
);

// admin
scoreRouter.get(
  "/",
  authenticate,
  requireRole("ADMIN"),
  scoreController.getAllScores,
);
scoreRouter.post(
  "/recompute",
  authenticate,
  requireRole("ADMIN"),
  scoreController.recomputeScores,
);

if (process.env.NODE_ENV === "development") {
  const prisma = require("../config/database");
  const { computeStudentScore } = require("../services/reader-score.service");

  // Test single student score — NO DB changes
  scoreRouter.get(
    "/test/student/:studentId",
    authenticate,
    requireRole("ADMIN"),
    async (req, res) => {
      try {
        const result = await computeStudentScore(req.params.studentId);
        const student = await prisma.user.findUnique({
          where: { id: req.params.studentId },
          select: { name: true, email: true, trustTier: true },
        });

        res.json({
          success: true,
          student: {
            name: student.name,
            email: student.email,
            currentTier: student.trustTier, // what's in DB now
            computedTier: result.tier, // what score says it should be
            tierChanged: student.trustTier !== result.tier,
            direction:
              student.trustTier !== result.tier
                ? ["BRONZE", "SILVER", "GOLD", "PLATINUM"].indexOf(
                    result.tier,
                  ) >
                  ["BRONZE", "SILVER", "GOLD", "PLATINUM"].indexOf(
                    student.trustTier,
                  )
                  ? "⬆️ UPGRADE"
                  : "⬇️ DOWNGRADE"
                : "➡️ NO CHANGE",
          },
          ...result,
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    },
  );

  // Preview ALL students — NO DB changes, just shows what WOULD happen
  scoreRouter.post(
    "/test/preview-all",
    authenticate,
    requireRole("ADMIN"),
    async (req, res) => {
      try {
        const students = await prisma.user.findMany({
          where: { role: "STUDENT", isActive: true },
          select: { id: true, name: true, email: true, trustTier: true },
        });

        const results = await Promise.all(
          students.map(async (student) => {
            const scoreData = await computeStudentScore(student.id);
            const tierOrder = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];
            const tierChanged = student.trustTier !== scoreData.tier;
            const direction = tierChanged
              ? tierOrder.indexOf(scoreData.tier) >
                tierOrder.indexOf(student.trustTier)
                ? "⬆️ UPGRADE"
                : "⬇️ DOWNGRADE"
              : "➡️ NO CHANGE";

            return {
              id: student.id,
              name: student.name,
              email: student.email,
              currentTier: student.trustTier,
              computedScore: scoreData.score,
              computedTier: scoreData.tier,
              tierChanged,
              direction,
              nextTier: scoreData.nextTier,
              pointsToNextTier: scoreData.pointsToNextTier,
              breakdown: scoreData.breakdown,
              stats: scoreData.stats,
            };
          }),
        );

        // Sort by score descending
        results.sort((a, b) => b.computedScore - a.computedScore);

        const summary = {
          total: results.length,
          wouldUpgrade: results.filter((r) => r.direction.includes("UPGRADE"))
            .length,
          wouldDowngrade: results.filter((r) =>
            r.direction.includes("DOWNGRADE"),
          ).length,
          noChange: results.filter((r) => r.direction.includes("NO CHANGE"))
            .length,
        };

        res.json({
          success: true,
          note: "⚠️ PREVIEW ONLY — No DB changes made",
          summary,
          results,
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    },
  );

  scoreRouter.post(
    "/test/recompute",
    authenticate,
    requireRole("ADMIN"),
    scoreController.recomputeScores,
  );
}

module.exports = scoreRouter;
