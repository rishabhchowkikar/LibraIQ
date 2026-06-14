const prisma = require("../config/database");

const {
  computeStudentScore,
  recomputeAllScores,
} = require("../services/reader-score.service");

// GET /api/scores/my-score (Student)
exports.getMyScore = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const result = await computeStudentScore(studentId);

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("get score error: ", error);
    res.status(400).json({ success: false, error: "Failed to compute score" });
  }
};

// GET /api/scores (Admin — all students)
exports.getAllScores = async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: "STUDENT", isActive: true },
      select: { id: true, name: true, email: true, trustTier: true },
      orderBy: { name: "desc" },
    });

    const scores = await Promise.all(
      students.map(async (student) => {
        const result = await computeStudentScore(student.id);
        return {
          student: {
            id: student.id,
            name: student.name,
            email: student.email,
            currentTier: student.trustTier,
          },
          ...result,
        };
      }),
    );

    // sort by score descending
    scores.sort((a, b) => b.score - a.score);
    res.json({ success: true, scores });
  } catch (error) {
    console.error("Get all scores error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch scores" });
  }
};

// POST /api/scores/recompute (Admin — manual trigger)
exports.recomputeScores = async (req, res) => {
  try {
    console.log("🔄 Manual score recomputation triggered by admin");
    const result = await recomputeAllScores();
    res.json({ success: true, result });
  } catch (error) {
    console.error("Recompute error:", error);
    res.status(500).json({ success: false, error: "Recomputation failed" });
  }
};
