
import { Request, Response } from "express";
import { SalaRepository } from "../repositories/SalaRepository";
import { ReservaRepository } from "../repositories/ReservaRepository";
import { Reserva } from "../models/Reserva";

const salaRepository = new SalaRepository();
const reservaRepository = new ReservaRepository();

export class RoomController {
  listarDisponiveis = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const salas = await salaRepository.listarTodas();
      const agora = new Date();

      const salasComStatus = await Promise.all(
        salas.map(async (sala) => {
          const reservaAtual = await reservaRepository.buscarReservaAtiva(
            String(sala.id),
            agora
          );

          return {
            ...sala.toJSON(),
            status:
              sala.ativa === false
                ? "inativa"
                : reservaAtual
                  ? "ocupada"
                  : "disponivel",
            ocupacaoAtual: reservaAtual,
            reservaAtual,
          };
        })
      );

      res.render("rooms/available-rooms", {
        salas: salasComStatus,
        atualizadoEm: agora,
        usuario: req.session.usuario,
      });
    } catch (err) {
      console.error("[RoomController.listarDisponiveis]", err);

      res.status(500).render("errors/500", {
        message: "Erro ao carregar a lista de salas.",
      });
    }
  };

  telaReserva = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const salas = await salaRepository.listarTodas();

      res.render("rooms/room-booking", {
        salas,
        usuario: req.session.usuario,
        salaSelecionada: String(req.query.salaId ?? ""),
        hoje: new Date().toISOString().slice(0, 10),
        filtros: {
          data: String(req.query.data ?? ""),
        },
        erro: null,
      });
    } catch (err) {
      console.error("[RoomController.telaReserva]", err);

      res.status(500).render("errors/500", {
        message: "Erro ao carregar a tela de reserva.",
      });
    }
  };

  confirmarReserva = async (
    req: Request,
    res: Response
  ): Promise<void> => {
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

      if (
        !salaId ||
        !data ||
        !horarioInicio ||
        !horarioFim ||
        !disciplina?.trim() ||
        !turma?.trim()
      ) {
        await this._renderErroReserva(
          req,
          res,
          400,
          "Preencha todos os campos do formulário."
        );
        return;
      }

      const salaIdNormalizado = String(salaId).trim();

      if (!salaIdNormalizado) {
        await this._renderErroReserva(
          req,
          res,
          400,
          "Sala inválida."
        );
        return;
      }

      const salas = await salaRepository.listarTodas();
      const salaExiste = salas.some(
        (sala) => String(sala.id) === salaIdNormalizado
      );

      if (!salaExiste) {
        await this._renderErroReserva(
          req,
          res,
          404,
          "Sala não encontrada."
        );
        return;
      }

      const formatoDataValido = /^\d{4}-\d{2}-\d{2}$/.test(data);
      const formatoHoraValido = (hora: string) =>
        /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);

      if (
        !formatoDataValido ||
        !formatoHoraValido(horarioInicio) ||
        !formatoHoraValido(horarioFim)
      ) {
        await this._renderErroReserva(
          req,
          res,
          400,
          "Data ou horário inválidos."
        );
        return;
      }

      const inicio = this._combinarDataHora(data, horarioInicio);
      const fim = this._combinarDataHora(data, horarioFim);

      if (
        Number.isNaN(inicio.getTime()) ||
        Number.isNaN(fim.getTime())
      ) {
        await this._renderErroReserva(
          req,
          res,
          400,
          "Data ou horário inválidos."
        );
        return;
      }

      if (fim <= inicio) {
        await this._renderErroReserva(
          req,
          res,
          400,
          "O horário de término deve ser posterior ao de início."
        );
        return;
      }

      const conflito = await reservaRepository.existeConflito(
        salaIdNormalizado,
        data,
        horarioInicio,
        horarioFim
      );

      if (conflito) {
        await this._renderErroReserva(
          req,
          res,
          409,
          "Já existe uma reserva para esta sala neste horário. Escolha outro horário ou sala."
        );
        return;
      }

      const novaReserva = new Reserva(
        salaIdNormalizado,
        String(usuario.id),
        disciplina.trim(),
        turma.trim(),
        data,
        horarioInicio,
        horarioFim,
        "confirmada"
      );

      await reservaRepository.criar(novaReserva);

      res.redirect("/bookings/my");
    } catch (err) {
      console.error("[RoomController.confirmarReserva]", err);

      if (!res.headersSent) {
        await this._renderErroReserva(
          req,
          res,
          500,
          "Erro ao processar a reserva. Tente novamente."
        );
      }
    }
  };

  private _combinarDataHora(data: string, hora: string): Date {
    return new Date(`${data}T${hora}:00`);
  }

  private async _renderErroReserva(
    req: Request,
    res: Response,
    status: number,
    mensagem: string
  ): Promise<void> {
    try {
      const salas = await salaRepository.listarTodas();

      res.status(status).render("rooms/room-booking", {
        salas,
        usuario: req.session.usuario,
        salaSelecionada: String(req.body?.salaId ?? req.query.salaId ?? ""),
        hoje: new Date().toISOString().slice(0, 10),
        filtros: {
          data: String(req.body?.data ?? req.query.data ?? ""),
        },
        erro: mensagem,
      });
    } catch (err) {
      console.error("[RoomController._renderErroReserva]", err);

      if (!res.headersSent) {
        res.status(status).json({
          success: false,
          message: mensagem,
        });
      }
    }
  }
}

export default new RoomController();
