const express = require("express");
const reviewRouter = express.Router();
const reviewController = require("../controllers/review.controller");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roleCheck");

reviewRouter.post(
  "/:bookId",
  authenticate,
  requireRole("STUDENT"),
  reviewController.createOrUpdateReview,
);

// static route before dynamic — same convention as reservations/extensions
reviewRouter.get(
  "/my-reviews",
  authenticate,
  requireRole("STUDENT"),
  reviewController.getMyReviews,
);

reviewRouter.get("/:bookId", authenticate, reviewController.getBookReviews);

reviewRouter.delete("/:id", authenticate, reviewController.deleteReview);

module.exports = reviewRouter;
