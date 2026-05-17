const requiredRole = (...allowedRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "UnAuthorised",
      });
    }

    if (!allowedRole.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Access Denied, Insufficient Permission",
      });
    }

    next();
  };
};

module.exports = requiredRole;
