const express = require("express");
const extensionRouter = express.Router();
const extensionController = require("../controllers/extension.controller");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roleCheck");

extensionRouter.get(
  "/my-extensions",
  authenticate,
  requireRole("STUDENT"),
  extensionController.getMyExtensions,
);

extensionRouter.post(
  "/",
  authenticate,
  requireRole("STUDENT"),
  extensionController.requestExtension,
);

extensionRouter.get(
  "/",
  authenticate,
  requireRole("ADMIN"),
  extensionController.getAllExtensions,
);

extensionRouter.patch(
  "/:id/approve",
  authenticate,
  requireRole("ADMIN"),
  extensionController.approveExtension,
);
extensionRouter.patch(
  "/:id/reject",
  authenticate,
  requireRole("ADMIN"),
  extensionController.rejectExtension,
);

module.exports = extensionRouter;
