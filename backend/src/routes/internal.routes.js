const express = require("express");
const internalRouter = express.Router();

const {
  runFineAccrual,
  sendDueReminders,
  runAdminOverdueReport,
} = require("../services/fine.service");
const { recomputeAllScores } = require("../services/reader-score.service");
const { expireReservations } = require("../services/reservation.service");

// Shared-secret auth — GitHub Actions has no user JWT, just this header.
const verifyCronSecret = (req, res, next) => {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.authorization !== `Bearer ${expected}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
};

// Respond first, run after — a cold Render instance + a long job can
// blow past the caller's timeout even though the job itself succeeds.
const triggerJob = (label, jobFn) => (req, res) => {
  res.status(202).json({ accepted: true, job: label });
  jobFn()
    .then((result) => console.log(`✅ [CRON:${label}] complete`, result || ""))
    .catch((err) => console.error(`❌ [CRON:${label}] failed:`, err.message));
};

internalRouter.post(
  "/cron/fine-accrual",
  verifyCronSecret,
  triggerJob("fine-accrual", runFineAccrual),
);
internalRouter.post(
  "/cron/due-reminders",
  verifyCronSecret,
  triggerJob("due-reminders", sendDueReminders),
);
internalRouter.post(
  "/cron/admin-report",
  verifyCronSecret,
  triggerJob("admin-report", runAdminOverdueReport),
);
internalRouter.post(
  "/cron/score-recompute",
  verifyCronSecret,
  triggerJob("score-recompute", recomputeAllScores),
);
internalRouter.post(
  "/cron/expire-reservations",
  verifyCronSecret,
  triggerJob("expire-reservations", expireReservations),
);

module.exports = internalRouter;
