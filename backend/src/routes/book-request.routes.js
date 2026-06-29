const express = require("express");
const bookRequestRouter = express.Router();
const bookRequestController = require("../controllers/book-request.controller");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roleCheck");

// student route

bookRequestRouter.get(
  "/my-requests",
  authenticate,
  requireRole("STUDENT"),
  bookRequestController.getMyRequests,
);

bookRequestRouter.post(
  "/",
  authenticate,
  requireRole("STUDENT"),
  bookRequestController.createRequest,
);

// Admin routes
bookRequestRouter.get(
  "/",
  authenticate,
  requireRole("ADMIN"),
  bookRequestController.getAllRequests,
);

bookRequestRouter.patch(
  "/:id/approve",
  authenticate,
  requireRole("ADMIN"),
  bookRequestController.approveRequest,
);

bookRequestRouter.patch(
  "/:id/reject",
  authenticate,
  requireRole("ADMIN"),
  bookRequestController.rejectRequest,
);

module.exports = bookRequestRouter;
