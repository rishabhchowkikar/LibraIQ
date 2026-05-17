const express = require("express");
const bookRouter = express.Router();
const bookController = require("../controllers/book.controller");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roleCheck");

// public routes (student can view books)
bookRouter.get("/", authenticate, bookController.getAllBooks);
bookRouter.get("/:id", authenticate, bookController.getBook);

// Admin - only routes
bookRouter.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  bookController.createBook,
);

bookRouter.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  bookController.updateBook,
);

bookRouter.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  bookController.deleteBook,
);

module.exports = bookRouter;
