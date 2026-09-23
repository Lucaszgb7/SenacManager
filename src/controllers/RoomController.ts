// src/controllers/RoomController.ts
import { Request, Response } from "express";

import { SalaRepository } from "../repositories/SalaRepository";
import { ReservaRepository } from "../repositories/ReservaRepository";
import { Reserva } from "../models/Reserva";

/**
 * Controller responsável pelas telas e ações relacionadas a salas.
 */
export class RoomController {
  /**
   * GET /rooms/available
   * Lista todas as salas com seu status atual (disponível/ocupada),
   * calculado em tempo real a partir das reservas confirmadas.
   */
  async listarDisponiveis(req: Request, res: Response): Promise<void> {
    try {
      const salas = await SalaRepository.listarTodas();
      const agora = new Date();

      // Para cada sala, checamos se existe reserva ativa NESTE instante.
      // Fazemos em paralelo para não serializar as consultas ao banco.
      const salasComStatus = await Promise.all(
        salas.map(async (sala) => {
          const reservaAtiva = await ReservaRepository.buscarReservaAtiva(
            sala.id,
            agora
          );
          return {
            ...sala,
            // Regra de negócio: sala ocupada se houver reserva confirmada
            // cobrindo o horário atual.
            status: reservaAtiva ? "ocupada" : "disponivel",
            reservaAtual: reservaAtiva ?? null,
          };
        })
      );

      return res.render("rooms/available-rooms", {
        salas: salasComStatus,
        atualizadoEm: agora,
        usuario: req.session.usuario, // útil para o header da view
      });
    } catch (err) {
      console.error("[RoomController.listarDisponiveis] Erro:", err);
      return res.status(500).render("errors/500", {
        message: "Erro ao carregar a lista de salas.",
      });
    }
  }

  /**
   * GET /rooms/booking
   * Renderiza o formulário de reserva junto com a lista de salas.
   */
  async telaReserva(req: Request, res: Response): Promise<void> {
    try {
      const salas = await SalaRepository.listarTodas();

      return res.render("rooms/room-booking", {
        salas,
        usuario: req.session.usuario,
        // Se vieram via querystring (ex.: ?salaId=3), pré-seleciona no form.
        salaSelecionada: req.query.salaId ?? null,
        erro: null, // sem erro na primeira renderização
      });
    } catch (err) {
      console.error("[RoomController.telaReserva] Erro:", err);
      return res.status(500).render("errors/500", {
        message: "Erro ao carregar a tela de reserva.",
      });
    }
  }

  /**
   * POST /rooms/booking
   * Recebe o formulário, valida conflito e cria a reserva.
   */
  async confirmarReserva(req: Request, res: Response): Promise<void> {
    try {
      const { salaId, data, horarioInicio, horarioFim, disciplina, turma } =
        req.body as {
          salaId?: string;
          data?: string;
          horarioInicio?: string;
          horarioFim?: string;
          disciplina?: string;
          turma?: string;
        };

      // SEGURANÇA: o professorId vem SEMPRE da sessão, nunca do body.
      // Isso impede que um professor crie reservas em nome de outro.
      const usuario = req.session.usuario;
      if (!usuario) {
        return res.status(401).json({
          success: false,
          message: "Não autenticado.",
        });
      }
      const professorId = usuario.id;

      // Validação de entrada — mensagens específicas ajudam o usuário.
      if (
        !salaId ||
        !data ||
        !horarioInicio ||
        !horarioFim ||
        !disciplina ||
        !turma
      ) {
        return this._renderErroReserva(
          res,
          400,
          "Preencha todos os campos do formulário."
        );
      }

      // Monta os objetos Date a partir dos campos do formulário.
      // Formato esperado: data="2025-06-10", horarioInicio="14:00".
      const inicio = this._combinarDataHora(data, horarioInicio);
      const fim = this._combinarDataHora(data, horarioFim);

      // Validação de coerência temporal.
      if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
        return this._renderErroReserva(
          res,
          400,
          "Data ou horário inválidos."
        );
      }
      if (fim <= inicio) {
        return this._renderErroReserva(
          res,
          400,
          "O horário de término deve ser posterior ao de início."
        );
      }

      // SEGURANÇA / REGRA DE NEGÓCIO: checa conflito na própria sala.
      const conflito = await ReservaRepository.existeConflito(
        Number(salaId),
        inicio,
        fim
      );
      if (conflito) {
        return this._renderErroReserva(
          res,
          409,
          "Já existe uma reserva para esta sala neste horário. Escolha outro horário ou sala."
        );
      }

      // Cria a reserva. Status inicial "confirmada".
      const novaReserva = new Reserva({
        salaId: Number(salaId),
        professorId,
        data: inicio,
        horarioInicio: inicio,
        horarioFim: fim,
        disciplina,
        turma,
        status: "confirmada",
      });

      await ReservaRepository.criar(novaReserva);

      // Sucesso → volta para a lista de reservas do professor.
      return res.redirect("/bookings/my");
    } catch (err) {
      console.error("[RoomController.confirmarReserva] Erro:", err);
      return this._renderErroReserva(
        res,
        500,
        "Erro ao processar a reserva. Tente novamente."
      );
    }
  }

  // -----------------------------------------------------------------
  // Helpers privados
  // -----------------------------------------------------------------

  /**
   * Combina "YYYY-MM-DD" + "HH:mm" em um Date no timezone local do servidor.
   * (Se o projeto usar UTC ou timezone explícito, ajuste aqui.)
   */
  private _combinarDataHora(data: string, hora: string): Date {
    return new Date(`${data}T${hora}:00`);
  }

  /**
   * Re-renderiza a tela de reserva com a mensagem de erro,
   * preservando os dados já digitados para não frustrar o usuário.
   */
  private async _renderErroReserva(
    res: Response,
    status: number,
    mensagem: string
  ): Promise<void> {
    try {
      const salas = await SalaRepository.listarTodas();
      return res.status(status).render("rooms/room-booking", {
        salas,
        erro: mensagem,
      });
    } catch (err) {
      console.error("[RoomController._renderErroReserva] Falha ao re-renderizar:", err);
      return res.status(status).json({ success: false, message: mensagem });
    }
  }
}

export default new RoomController();