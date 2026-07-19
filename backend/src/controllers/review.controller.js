const {
  createOrUpdateReview,
  deleteReview,
  getBookReviews,
  getMyReviews,
} = require("../services/review.service");

// POST /api/reviews/:bookId (Student)
exports.createOrUpdateReview = async (req, res) => {
  try {
    const { bookId } = req.params;
    const studentId = req.user.userId;
    const { rating, comment } = req.body;

    const review = await createOrUpdateReview(studentId, bookId, {
      rating,
      comment,
    });

    res.status(201).json({
      success: true,
      message: "Review saved successfully",
      review,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.statusCode ? error.message : "Failed to save review",
    });
  }
};

// GET /api/reviews/my-reviews (Student)
exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await getMyReviews(req.user.userId);
    res.json({ success: true, reviews });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch your reviews" });
  }
};

// GET /api/reviews/:bookId (any authenticated user)
exports.getBookReviews = async (req, res) => {
  try {
    const { bookId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await getBookReviews(bookId, { page, limit });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch reviews" });
  }
};

// DELETE /api/reviews/:id (owner or admin)
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteReview(id, req.user.userId, req.user.role);

    res.json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.statusCode ? error.message : "Failed to delete review",
    });
  }
};
