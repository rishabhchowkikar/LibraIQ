const prisma = require("../config/database");

// A student may only review a book they've actually finished borrowing
const hasCompletedLoan = async (studentId, bookId) => {
  const loan = await prisma.loan.findFirst({
    where: { studentId, bookId, returnedAt: { not: null } },
  });

  return !!loan;
};

// Recompute avgRating + reviewCount for a book (must run inside the same tx as the write)
const recomputeBookRating = async (tx, bookId) => {
  const agg = await tx.review.aggregate({
    where: { bookId },
    _avg: { rating: true },
    _count: true,
  });

  await tx.book.update({
    where: { id: bookId },
    data: {
      avgRating: agg._avg.rating || 0,
      reviewCount: agg._count,
    },
  });
};

// Create or update a student's review for a book
const createOrUpdateReview = async (studentId, bookId, { rating, comment }) => {
  if (!rating || rating < 1 || rating > 5) {
    const err = new Error("Rating must be between 1 and 5");
    err.statusCode = 400;
    throw err;
  }

  const eligible = await hasCompletedLoan(studentId, bookId);
  if (!eligible) {
    const err = new Error(
      "You can only review books you've borrowed and returned",
    );
    err.statusCode = 403;
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    const review = await tx.review.upsert({
      where: { studentId_bookId: { studentId, bookId } },
      create: { studentId, bookId, rating, comment },
      update: { rating, comment },
    });

    await recomputeBookRating(tx, bookId);

    return review;
  });
};

// Delete a review — allowed for the owner or an admin
const deleteReview = async (reviewId, requesterId, requesterRole) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });

  if (!review) {
    const err = new Error("Review not found");
    err.statusCode = 404;
    throw err;
  }

  if (review.studentId !== requesterId && requesterRole !== "ADMIN") {
    const err = new Error("You can only delete your own review");
    err.statusCode = 403;
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: reviewId } });
    await recomputeBookRating(tx, review.bookId);
    return review;
  });
};

// Paginated reviews for a book
const getBookReviews = async (bookId, { page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { bookId },
      include: { student: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.review.count({ where: { bookId } }),
  ]);

  return { reviews, total, page, pages: Math.ceil(total / limit) };
};

// A student's own reviews
const getMyReviews = async (studentId) => {
  return prisma.review.findMany({
    where: { studentId },
    include: {
      book: { select: { id: true, title: true, author: true, coverUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

module.exports = {
  createOrUpdateReview,
  deleteReview,
  getBookReviews,
  getMyReviews,
};
