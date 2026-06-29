const prisma = require("../config/database");

const createLog = async ({
  action,
  actorId,
  actorRole,
  targetType,
  targetId,
  details = {},
  ipAddress = null,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        actorId,
        actorRole,
        targetType,
        targetId: targetId || "unknown",
        details,
        ipAddress,
      },
    });
  } catch (error) {
    // Non-critical — never block the main operation
    console.warn("⚠️  Audit log failed:", error.message);
  }
};

module.exports = { createLog };
