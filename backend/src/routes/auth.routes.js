const express = require("express");
const authRouter = express.Router();
const authController = require("../controllers/auth.controller");
const authenticate = require("../middleware/auth");

authRouter.post("/register", authController.register);
authRouter.post("/login", authController.login);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.post("/me", authenticate, authController.me);

module.exports = authRouter;
