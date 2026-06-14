const prisma = require("../config/database");
const {
  getBookRecommendations,
  getScoreExplanation,
  getGenreDNA,
  getStudentSummary,
} = require("../services/ai.service");
const {
  recomputeAllScores,
  computeStudentScore,
} = require("../services/reader-score.service");

// GET /api/ai/recommendations (Student)
exports.getRecommendations = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const result = await getBookRecommendations(studentId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Recommendations error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to get recommendations" });
  }
};

// GET /api/ai/score-explanation (Student)
exports.getScoreExplanation = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const scoreData = await computeStudentScore(studentId);
    const result = await getScoreExplanation(studentId, scoreData);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Score explanation error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to get score explanation" });
  }
};

// GET /api/ai/genre-dna (Student)
exports.getGenreDNA = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const result = await getGenreDNA(studentId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Genre DNA error:", error);
    res.status(500).json({ success: false, error: "Failed to get Genre DNA" });
  }
};

// GET /api/ai/student-summary/:studentId (Admin)
exports.getStudentSummary = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        name: true,
        id: true,
      },
    });
    if (!student) {
      return res.status(404).json({
        success: false,
        error: "student not found",
      });
    }
    const result = await getStudentSummary(studentId);
    res.json({ success: true, student, ...result });
  } catch (error) {
    console.error("student summary error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to get student summary" });
  }
};

exports.getStatus = async (req, res) => {
  res.json({
    success: true,
    configured: !!process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    provider: "Groq",
  });
};
