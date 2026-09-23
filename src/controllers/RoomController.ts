import { Request, Response } from "express";

import { SalaRepository } from "../repositories/SalaRepository";
import { ReservaRepository } from "../repositories/ReservaRepository";
import { Reserva } from "../models/Reserva";

export class RoomController {
  private salaRepository: SalaRepository;
  private reservaRepository: ReservaRepository;

  constructor() {
    this.salaRepository = new SalaRepository();
    this.reservaRepository = new ReservaRepository();
  }

  /**
   * GET /rooms/available
   */
  async listarDisponiveis(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const salas = await this.salaRepository.listarTodas();
      const agora = new Date();

      const salasComStatus = await Promise.all(
        salas.map(async (sala) => {
          const reservaAtiva =
            await this.reservaRepository.buscarReservaAtiva(
              sala.id,
              agora
            );

          return {
            ...sala,
            status: reservaAtiva ? "ocupada" : "disponivel",
            reservaAtual: reservaAtiva ?? null,
          };
        })
      );

      res.render("rooms/available-rooms", {
        salas: salasComStatus,
        atualizadoEm: agora,
        usuario: req.session.usuario,
      });
    } catch (err) {
      console.error(
        "[RoomController.listarDisponiveis] Erro:",
        err
      );

      res.status(500).render("errors/500", {
        message: "Erro ao carregar a lista de salas.",
      });
    }
  }

  /**
   * GET /rooms/booking
   */
  async telaReserva(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const salas =
        await this.salaRepository.listarTodas();

      res.render("rooms/room-booking", {
        salas,
        usuario: req.session.usuario,
        salaSelecionada:
          req.query.salaId ?? null,
        erro: null,
      });
    } catch (err) {
      console.error(
        "[RoomController.telaReserva] Erro:",
        err
      );

      res.status(500).render("errors/500", {
        message: "Erro ao carregar a tela de reserva.",
      });
    }
  }

  /**
   * POST /rooms/booking
   */
  async confirmarReserva(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const {
        salaId,
        data,
        horarioInicio,
        horarioFim,
        disciplina,
        turma,
      } = req.body as {
        salaId?: string;
        data?: string;
        horarioInicio?: string;
        horarioFim?: string;
        disciplina?: string;
        turma?: string;
      };

      const usuario = req.session.usuario;

      if (!usuario) {
        res.status(401).json({
          success: false,
          message: "Não autenticado.",
        });
        return;
      }

      const professorId = usuario.id;

      if (
        !salaId ||
        !data ||
        !horarioInicio ||
        !horarioFim ||
        !disciplina ||
        !turma
      ) {
        await this._renderErroReserva(
          res,
          400,
          "Preencha todos os campos do formulário."
        );
        return;
      }

      const inicio = this._combinarDataHora(
        data,
        horarioInicio
      );

      const fim = this._combinarDataHora(
        data,
        horarioFim
      );

      if (
        isNaN(inicio.getTime()) ||
        isNaN(fim.getTime())
      ) {
        await this._renderErroReserva(
          res,
          400,
          "Data ou horário inválidos."
        );
        return;
      }

      if (fim <= inicio) {
        await this._renderErroReserva(
          res,
          400,
          "O horário de término deve ser posterior ao de início."
        );
        return;
      }

      const conflito =
        await this.reservaRepository.existeConflito(
          salaId,
          data,
          horarioInicio,
          horarioFim
        );

      if (conflito) {
        await this._renderErroReserva(
          res,
          409,
          "Já existe uma reserva para esta sala neste horário. Escolha outro horário ou sala."
        );
        return;
      }

      const novaReserva = new Reserva(
        salaId,
        professorId,
        disciplina,
        turma,
        data,
        horarioInicio,
        horarioFim,
        "confirmada"
      );

      await this.reservaRepository.criar(
        novaReserva
      );

      res.redirect("/bookings/my");
    } catch (err) {
      console.error(
        "[RoomController.confirmarReserva] Erro:",
        err
      );

      await this._renderErroReserva(
        res,
        500,
        "Erro ao processar a reserva. Tente novamente."
      );
    }
  }

  /**
   * Combina data e horário.
   */
  private _combinarDataHora(
    data: string,
    hora: string
  ): Date {
    return new Date(`${data}T${hora}:00`);
  }

  /**
   * Renderiza a tela de reserva com erro.
   */
  private async _renderErroReserva(
    res: Response,
    status: number,
    mensagem: string
  ): Promise<void> {
    try {
      const salas =
        await this.salaRepository.listarTodas();

      res.status(status).render(
        "rooms/room-booking",
        {
          salas,
          erro: mensagem,
        }
      );
    } catch (err) {
      console.error(
        "[RoomController._renderErroReserva] Falha:",
        err
      );

      res.status(status).json({
        success: false,
        message: mensagem,
      });
    }
  }
}

export default new RoomController();