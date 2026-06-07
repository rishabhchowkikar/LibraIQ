// GET /api/users/search?q=arjun

const prisma = require("../config/database");

exports.searchStudents = async (req, res, next) => {
  try {
    const { q } = req.query;

    // Return empty if query too short

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: true, users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        trustTier: true,
      },
      take: 8,
      orderBy: { name: "asc" },
    });

    res.json({ success: true, users });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Search failed", details: error.message });
  }
};
