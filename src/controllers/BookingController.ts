// src/controllers/BookingController.ts
import { Request, Response } from "express";

import { ReservaRepository } from "../repositories/ReservaRepository";
import { Reserva } from "../models/Reserva";

/**
 * Controller das reservas do professor logado.
 *
 * Observações importantes sobre este projeto:
 * - O ReservaRepository é baseado em ARQUIVO JSON e é INSTANCIÁVEL
 *   (não usamos métodos estáticos).
 * - `id` e `professorId` são STRINGS (não números).
 * - As datas/horas são STRINGS no formato "YYYY-MM-DD" e "HH:mm".
 *   Por isso comparamos strings, não Date.
 */
export class BookingController {
  // Instancia o repository uma vez e reusa.
  private reservaRepo = new ReservaRepository();

  /**
   * GET /bookings/my
   */
  async minhasReservas(req: Request, res: Response): Promise<Response | void> {
    try {
      const usuario = req.session.usuario;
      if (!usuario) {
        res.redirect("/login");
        return;
      }

      // SEGURANÇA: filtramos SEMPRE pelo id da sessão.
      const reservas: Reserva[] = await this.reservaRepo.listarPorProfessor(
        usuario.id
      );

      // Para separar futuras/passadas, convertemos a reserva em um
      // "datetime" comparável (string "YYYY-MM-DDTHH:mm"). Como o formato
      // é lexicograficamente ordenável, `>` e `<` funcionam direto.
      const agora = this.agoraComoStringComparavel();

      const futuras = reservas
        .filter((r) => this.fimDaReserva(r) > agora)
        .sort((a, b) => this.inicioDaReserva(a).localeCompare(this.inicioDaReserva(b)));

      const passadas = reservas
        .filter((r) => this.fimDaReserva(r) <= agora)
        .sort((a, b) => this.inicioDaReserva(b).localeCompare(this.inicioDaReserva(a)));

      res.render("bookings/my-bookings", {
        futuras,
        passadas,
        usuario,
        agora: new Date(),
      });
      return;
    } catch (err) {
      console.error("[BookingController.minhasReservas] Erro:", err);
      res.status(500).render("errors/500", {
        message: "Erro ao carregar suas reservas.",
      });
      return;
    }
  }

  /**
   * POST /bookings/:id/cancelar
   */
  async cancelar(req: Request, res: Response): Promise<Response | void> {
    try {
      const usuario = req.session.usuario;
      if (!usuario) {
        res.status(401).json({
          success: false,
          message: "Não autenticado.",
        });
        return;
      }

      // Aqui o id é STRING (o repository trabalha com ids string).
      const reservaId = String(req.params.id);
      if (!reservaId) {
        res.status(400).json({
          success: false,
          message: "Identificador de reserva inválido.",
        });
        return;
      }

      // SEGURANÇA (IDOR): valida posse ANTES de cancelar.
      const reserva = await this.reservaRepo.buscarPorId(reservaId);
      if (!reserva) {
        res.status(404).json({
          success: false,
          message: "Reserva não encontrada.",
        });
        return;
      }

      if (reserva.professorId !== usuario.id) {
        res.status(403).json({
          success: false,
          message: "Você não tem permissão para cancelar esta reserva.",
        });
        return;
      }

      // Regra de negócio: não cancelar reservas já passadas.
      if (this.fimDaReserva(reserva) <= this.agoraComoStringComparavel()) {
        res.status(409).json({
          success: false,
          message: "Não é possível cancelar uma reserva que já ocorreu.",
        });
        return;
      }

      const cancelada = await this.reservaRepo.cancelar(reservaId);
      if (!cancelada) {
        res.status(500).json({
          success: false,
          message: "Não foi possível cancelar a reserva.",
        });
        return;
      }

      // fetch → JSON; form tradicional → redirect.
      const accept = req.headers["accept"] ?? "";
      if (accept.includes("application/json")) {
        res.json({
          success: true,
          message: "Reserva cancelada com sucesso.",
        });
        return;
      }
      res.redirect("/bookings/my");
      return;
    } catch (err) {
      console.error("[BookingController.cancelar] Erro:", err);
      res.status(500).json({
        success: false,
        message: "Erro ao cancelar a reserva.",
      });
      return;
    }
  }

  // -----------------------------------------------------------------
  // Helpers privados
  // -----------------------------------------------------------------

  /**
   * Retorna "YYYY-MM-DDTHH:mm" do momento atual, no fuso local.
   * Esse formato é comparável como string (ordem lexicográfica == ordem
   * cronológica), o que evita bugs de timezone que `new Date()` traria.
   */
  private agoraComoStringComparavel(): string {
    const d = new Date();
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    const hora = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${ano}-${mes}-${dia}T${hora}:${min}`;
  }

  private inicioDaReserva(r: Reserva): string {
    return `${r.data}T${r.horarioInicio}`;
  }

  private fimDaReserva(r: Reserva): string {
    return `${r.data}T${r.horarioFim}`;
  }
}

export default new BookingController();