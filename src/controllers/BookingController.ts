// src/controllers/BookingController.ts
import { Request, Response } from "express";

import { ReservaRepository } from "../repositories/ReservaRepository";

/**
 * Controller das reservas do professor logado.
 */
export class BookingController {
  /**
   * GET /bookings/my
   * Lista as reservas do professor logado, separadas em futuras/passadas.
   */
  async minhasReservas(req: Request, res: Response): Promise<void> {
    try {
      const usuario = req.session.usuario;
      if (!usuario) {
        return res.redirect("/login");
      }

      // SEGURANÇA: filtramos SEMPRE pelo id da sessão.
      // Mesmo que um professor tente /bookings/my?professorId=5,
      // ignoramos a query — não há como ver reservas de outro.
      const reservas = await ReservaRepository.listarPorProfessor(usuario.id);

      const agora = new Date();

      // "Futuras": o término ainda não passou. Inclui as que estão
      // acontecendo agora (fim > agora), pois ainda são relevantes.
      const futuras = reservas
        .filter((r) => new Date(r.horarioFim) > agora)
        .sort(
          (a, b) =>
            new Date(a.horarioInicio).getTime() -
            new Date(b.horarioInicio).getTime()
        );

      // "Passadas": já terminaram. Ordem inversa (mais recentes primeiro).
      const passadas = reservas
        .filter((r) => new Date(r.horarioFim) <= agora)
        .sort(
          (a, b) =>
            new Date(b.horarioInicio).getTime() -
            new Date(a.horarioInicio).getTime()
        );

      return res.render("bookings/my-bookings", {
        futuras,
        passadas,
        usuario,
        agora,
      });
    } catch (err) {
      console.error("[BookingController.minhasReservas] Erro:", err);
      return res.status(500).render("errors/500", {
        message: "Erro ao carregar suas reservas.",
      });
    }
  }

  /**
   * POST /bookings/:id/cancelar
   * Cancela uma reserva, desde que pertença ao professor logado.
   */
  async cancelar(req: Request, res: Response): Promise<void> {
    try {
      const usuario = req.session.usuario;
      if (!usuario) {
        return res.status(401).json({
          success: false,
          message: "Não autenticado.",
        });
      }

      const reservaId = Number(req.params.id);
      if (!Number.isInteger(reservaId) || reservaId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Identificador de reserva inválido.",
        });
      }

      // SEGURANÇA (IDOR): carregamos a reserva e verificamos a posse
      // ANTES de cancelar. Sem isso, um professor poderia cancelar a
      // reserva de outro apenas chutando IDs.
      const reserva = await ReservaRepository.buscarPorId(reservaId);
      if (!reserva) {
        return res.status(404).json({
          success: false,
          message: "Reserva não encontrada.",
        });
      }

      if (reserva.professorId !== usuario.id) {
        // 403 e não 404: o recurso existe, o usuário só não pode mexer.
        // (Se preferir esconder a existência, troque por 404.)
        return res.status(403).json({
          success: false,
          message: "Você não tem permissão para cancelar esta reserva.",
        });
      }

      // Regra de negócio: não permitir cancelar reservas já passadas.
      if (new Date(reserva.horarioFim) <= new Date()) {
        return res.status(409).json({
          success: false,
          message: "Não é possível cancelar uma reserva que já ocorreu.",
        });
      }

      await ReservaRepository.cancelar(reservaId);

      // Se for fetch → JSON; se for form tradicional → redirect.
      const accept = req.headers["accept"] ?? "";
      if (accept.includes("application/json")) {
        return void res.json({
          success: true,
          message: "Reserva cancelada com sucesso.",
        });
      }
      return void res.redirect("/bookings/my");
    } catch (err) {
      console.error("[BookingController.cancelar] Erro:", err);
      return res.status(500).json({
        success: false,
        message: "Erro ao cancelar a reserva.",
      });
    }
  }
}

export default new BookingController();