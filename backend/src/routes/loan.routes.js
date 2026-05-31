const express = require("express");
const loanRouter = express.Router();
const loanController = require("../controllers/loan.controller");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roleCheck");

// Student routes
loanRouter.get(
  "/my-loans",
  authenticate,
  requireRole("STUDENT"),
  loanController.getMyLoans,
);

// Admin routes
loanRouter.post(
  "/issue",
  authenticate,
  requireRole("ADMIN"),
  loanController.issueBook,
);
loanRouter.post(
  "/return",
  authenticate,
  requireRole("ADMIN"),
  loanController.returnBook,
);

loanRouter.post(
  "/mark-lost",
  authenticate,
  requireRole("ADMIN"),
  loanController.markAsLost,
);

loanRouter.get(
  "/",
  authenticate,
  requireRole("ADMIN"),
  loanController.getAllLoans,
);

module.exports = loanRouter;
