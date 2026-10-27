// src/routes/roomRoutes.ts
import { Router } from "express";

import RoomController from "../controllers/RoomController";
import { autenticado } from "../middlewares/authMiddleware";
import { permitirPerfis } from "../middlewares/perfilMiddleware";

const roomRoutes = Router();

/**
 * GET /rooms/available
 * Lista de salas com status atual — qualquer usuário autenticado
 * (professor, aluno, admin) pode consultar.
 */
roomRoutes.get("/rooms/available", autenticado, RoomController.listarDisponiveis);

/**
 * GET /rooms/booking
 * Formulário de reserva — apenas professores.
 */
roomRoutes.get(
  "/rooms/booking",
  autenticado,
  permitirPerfis("professor"),
  RoomController.telaReserva
);

/**
 * POST /rooms/booking
 * Efetiva a reserva — apenas professores.
 */
roomRoutes.post(
  "/rooms/booking",
  autenticado,
  permitirPerfis("professor"),
  RoomController.confirmarReserva
);

export default roomRoutes;