const express = require("express");
const reservationRouter = express.Router();
const reservationController = require("../controllers/reservation.controller");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/roleCheck");

// student
reservationRouter.post(
  "/",
  authenticate,
  requireRole("STUDENT"),
  reservationController.createReservation,
);

reservationRouter.get(
  "/my-reservations",
  authenticate,
  requireRole("STUDENT"),
  reservationController.getMyReservations,
);

reservationRouter.delete(
  "/:id",
  authenticate,
  requireRole("STUDENT"),
  reservationController.cancelReservation,
);

// admin
reservationRouter.get(
  "/",
  authenticate,
  requireRole("ADMIN"),
  reservationController.getAllReservations,
);

module.exports = reservationRouter;
