require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const prisma = require("./config/database");

const authRoutes = require("./routes/auth.routes");
const bookRoutes = require("./routes/book.routes");
const loanRoutes = require("./routes/loan.routes");
const fineRoutes = require("./routes/fine.routes");
const paymentRoutes = require("./routes/payment.routes");
const notificationRoutes = require("./routes/notification.routes");
const scoreRoutes = require("../src/routes/score.routes");
const aiRoutes = require("./routes/ai.routes");
const analyticRoutes = require("./routes/analytics.routes");
const auditRoutes = require("./routes/audit.routes");
const bookRequestRoutes = require("./routes/book-request.routes");

const { initCronjobs } = require("./jobs/cron");
const { verifyEmailConnection } = require("./services/email.service");
const { verifyRedisConnection } = require("./config/redis");
const reservationRoutes = require("./routes/reservation.routes");
const extensionRoutes = require("./routes/extension.routes");
const readingStatsRoutes = require("./routes/reading-stats.routes");

const app = express();

// middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// ── IMPORTANT: Webhook raw body BEFORE express.json() ───────
app.use(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    // Attach raw body for signature verification
    req.rawBody = req.body;
    next();
  },
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/fines", fineRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/book-requests", bookRequestRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/extensions", extensionRoutes);
app.use("/api/reading-stats", readingStatsRoutes);

// health
app.get("/health", async (req, res) => {
  const health = {
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    database: {
      status: "unknown",
      responseTime: null,
    },
  };
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const endTime = Date.now();

    health.database.status = "connected";
    health.database.responseTime = `${endTime - startTime}ms`;

    res.status(200).json(health);
  } catch (error) {
    health.status = "ERROR";
    health.database.status = "disconnected";
    health.database.error = error.message;

    res.status(503).json(health);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    ...(process.env.NODE_ENV === "development" && { details: error.message }),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API: http://localhost:${PORT}`);

  // initial email service
  await verifyEmailConnection();
  await verifyRedisConnection();

  // initialize corn jobs
  initCronjobs();
});
