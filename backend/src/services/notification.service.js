const prisma = require("../config/database");

/**
 * Create an in-app notification for a user
 */

const createNotification = async ({
  userId,
  type,
  message,
  channel = "BOTH",
}) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        channel,
      },
    });
    return notification;
  } catch (error) {
    console.log("failed to create notification:", error);
    return null;
  }
};

/**
 * Create notifications for multiple users at once
 */

const createBulkNotifications = async (notifications) => {
  try {
    const result = await prisma.notification.createMany({
      data: notifications,
    });
    return result;
  } catch (error) {
    console.error("Failed to create bulk notifications:", error);
    return null;
  }
};

module.exports = {
  createNotification,
  createBulkNotifications,
};
