const express = require("express");
const authRouter = express.Router();
const authController = require("../controllers/auth.controller");
const userController = require("../controllers/user.controller");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roleCheck");

authRouter.post("/register", authController.register);
authRouter.post("/login", authController.login);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.post("/me", authenticate, authController.me);
authRouter.get(
  "/users/search",
  authenticate,
  requireRole("ADMIN"),
  userController.searchStudents,
);

module.exports = authRouter;
