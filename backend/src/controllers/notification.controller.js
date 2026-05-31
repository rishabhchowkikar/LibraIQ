const prisma = require("../config/database");

// GET /api/notifications — Get user's notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20, unreadOnly } = req.query;

    const where = { userId };
    if (unreadOnly === "true") where.isRead = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { sentAt: "desc" },
      take: parseInt(limit),
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    res.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("❌ Notification error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch notifications",
      details: error.message,
    });
  }
};

// PATCH /api/notifications/:id/read — Mark single as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to update notification" });
  }
};

// PATCH /api/notifications/read-all — Mark all as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: `${result.count} notifications marked as read`,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to update notifications" });
  }
};
