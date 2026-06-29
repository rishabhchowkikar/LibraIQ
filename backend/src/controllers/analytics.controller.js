const {
  getOverviewStats,
  getLoansTrend,
  getRevenueTrend,
  getTopBooks,
  getTierDistribution,
  getScoreDistribution,
  getFineTrend,
} = require("../services/analytics.service");

exports.getOverview = async (req, res) => {
  try {
    const data = await getOverviewStats();
    res.json({ success: true, ...data });
  } catch (error) {
    console.error("Analytics overview error:", error);
    res
      .status(500)
      .json({ success: false, message: "failed to fetch overviews" });
  }
};

exports.getLoansTrend = async (req, res) => {
  try {
    const data = await getLoansTrend();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Loanstrend error:", error);
    res
      .status(500)
      .json({ success: false, message: "failed to fetch loan trend" });
  }
};

exports.getRevenueTrend = async (req, res) => {
  try {
    const data = await getRevenueTrend();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Revenue trend error:", error);
    res
      .status(500)
      .json({ success: false, message: "failed to fetch revenue trend" });
  }
};

exports.getTopBooks = async (req, res) => {
  try {
    const data = await getTopBooks();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Top books error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch top books" });
  }
};

exports.getTierDistribution = async (req, res) => {
  try {
    const data = await getTierDistribution();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Tier distribution error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch tier distribution" });
  }
};

exports.getScoreDistribution = async (req, res) => {
  try {
    const data = await getScoreDistribution();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Score distribution error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch score distribution" });
  }
};

exports.getFineTrend = async (req, res) => {
  try {
    const data = await getFineTrend();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Fine trend error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch fine trend" });
  }
};
