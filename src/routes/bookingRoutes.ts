// src/routes/bookingRoutes.ts
import { Router } from "express";

import BookingController from "../controllers/BookingController";
import { autenticado } from "../middlewares/authMiddleware";
import { permitirPerfis } from "../middlewares/perfilMiddleware";

const bookingRoutes = Router();

/**
 * GET /bookings/my
 * Minhas reservas — apenas o próprio professor vê as suas.
 */
bookingRoutes.get(
  "/bookings/my",
  autenticado,
  permitirPerfis("professor"),
  BookingController.minhasReservas.bind(BookingController)
);

/**
 * POST /bookings/:id/cancelar
 * Cancela reserva. A posse é validada no controller (IDOR).
 */
bookingRoutes.post(
  "/bookings/:id/cancelar",
  autenticado,
  permitirPerfis("professor"),
  BookingController.cancelar.bind(BookingController)
);

export default bookingRoutes;