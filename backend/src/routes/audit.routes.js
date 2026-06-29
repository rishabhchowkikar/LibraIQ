const express = require("express");
const auditRouter = express.Router();
const auditController = require("../controllers/audit.controller");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roleCheck");

auditRouter.get(
  "/",
  authenticate,
  requireRole("ADMIN"),
  auditController.getAuditLogs,
);

module.exports = auditRouter;
