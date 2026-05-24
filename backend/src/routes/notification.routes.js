const express = require("express");
const notificationRouter = express.Router();
const notificationController = require("../controllers/notification.controller");
const authenticate = require("../middleware/auth");

notificationRouter.get(
  "/",
  authenticate,
  notificationController.getNotifications,
);
notificationRouter.patch(
  "/read-all",
  authenticate,
  notificationController.markAllAsRead,
);
notificationRouter.patch(
  "/:id/read",
  authenticate,
  notificationController.markAsRead,
);

module.exports = notificationRouter;
