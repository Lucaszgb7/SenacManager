
import { Request, Response } from "express";
import { ReservaRepository } from "../repositories/ReservaRepository";

const reservaRepository = new ReservaRepository();

/**
 * Controller das reservas do professor logado.
 */
export class BookingController {
  /**
   * GET /bookings/my
   * Lista as reservas do professor logado.
   */
  async minhasReservas(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const usuario = req.session.usuario;

      if (!usuario) {
        res.redirect("/login");
        return;
      }

      const reservas = await reservaRepository.listarPorProfessor(
        String(usuario.id)
      );

      const agora = new Date();

      const futuras = reservas
        .filter((reserva) => {
          const termino = new Date(
            `${reserva.data}T${reserva.horarioFim}:00`
          );

          return termino > agora;
        })
        .sort(
          (a, b) =>
            new Date(`${a.data}T${a.horarioInicio}:00`).getTime() -
            new Date(`${b.data}T${b.horarioInicio}:00`).getTime()
        );

      const passadas = reservas
        .filter((reserva) => {
          const termino = new Date(
            `${reserva.data}T${reserva.horarioFim}:00`
          );

          return termino <= agora;
        })
        .sort(
          (a, b) =>
            new Date(`${b.data}T${b.horarioInicio}:00`).getTime() -
            new Date(`${a.data}T${a.horarioInicio}:00`).getTime()
        );

      res.render("bookings/my-bookings", {
        futuras,
        passadas,
        usuario,
        agora,
      });
    } catch (err) {
      console.error("[BookingController.minhasReservas]", err);

      res.status(500).render("errors/500", {
        message: "Erro ao carregar suas reservas.",
      });
    }
  }

  /**
   * POST /bookings/:id/cancelar
   * Cancela uma reserva pertencente ao professor logado.
   */
  async cancelar(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const usuario = req.session.usuario;

      if (!usuario) {
        res.status(401).json({
          success: false,
          message: "Não autenticado.",
        });
        return;
      }

      const reservaId = String(req.params.id ?? "").trim();

      if (!reservaId) {
        res.status(400).json({
          success: false,
          message: "Identificador de reserva inválido.",
        });
        return;
      }

      const reserva = await reservaRepository.buscarPorId(reservaId);

      if (!reserva) {
        res.status(404).json({
          success: false,
          message: "Reserva não encontrada.",
        });
        return;
      }

      if (reserva.professorId !== String(usuario.id)) {
        res.status(403).json({
          success: false,
          message: "Você não tem permissão para cancelar esta reserva.",
        });
        return;
      }

      const terminoReserva = new Date(
        `${reserva.data}T${reserva.horarioFim}:00`
      );

      if (terminoReserva <= new Date()) {
        res.status(409).json({
          success: false,
          message: "Não é possível cancelar uma reserva que já ocorreu.",
        });
        return;
      }

      await reservaRepository.cancelar(reservaId);

      const accept = req.headers.accept ?? "";

      if (accept.includes("application/json")) {
        res.json({
          success: true,
          message: "Reserva cancelada com sucesso.",
        });
        return;
      }

      res.redirect("/bookings/my");
    } catch (err) {
      console.error("[BookingController.cancelar]", err);

      res.status(500).json({
        success: false,
        message: "Erro ao cancelar a reserva.",
      });
    }
  }
}

export default new BookingController();
