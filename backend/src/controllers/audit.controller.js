const prisma = require("../config/database");

exports.getAuditLogs = async (req, res) => {
  try {
    const { action, targetType, actorRole, page = 1, limit = 50 } = req.query;

    const where = {};
    if (action) where.action = { contains: action, mode: "insensitive" };
    if (targetType) where.targetType = targetType;
    if (actorRole) where.actorRole = actorRole;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({
      success: true,
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Audit logs error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch audit logs" });
  }
};
