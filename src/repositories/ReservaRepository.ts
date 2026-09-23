import { resolve } from "path";
import { Reserva } from "../models/Reserva";
import { BaseRepository } from "./BaseRepository";

export class ReservaRepository extends BaseRepository {
  private readonly caminhoArquivo = resolve(
    __dirname,
    "../../src/data",
    "reservas.json"
  );

  constructor() {
    super();
  }

  protected fromJSON(dados: any): Reserva {
    return Reserva.fromJSON(dados);
  }

  async listarTodas(): Promise<Reserva[]> {
    const dados = await this.lerArquivo(
      this.caminhoArquivo
    );

    return dados.map((item) =>
      this.fromJSON(item)
    );
  }

  async listarPorProfessor(
    professorId: string
  ): Promise<Reserva[]> {
    const reservas = await this.listarTodas();

    return reservas.filter(
      (reserva) =>
        reserva.professorId === professorId
    );
  }

  async listarPorSala(
    salaId: string
  ): Promise<Reserva[]> {
    const reservas = await this.listarTodas();

    return reservas.filter(
      (reserva) =>
        reserva.salaId === salaId
    );
  }

  async buscarPorId(
    id: string
  ): Promise<Reserva | null> {
    const reservas = await this.listarTodas();

    return (
      reservas.find(
        (reserva) => reserva.id === id
      ) ?? null
    );
  }

  async criar(
    reserva: Reserva
  ): Promise<Reserva> {
    const reservas = await this.listarTodas();

    reservas.push(reserva);

    await this.salvarArquivo(
      this.caminhoArquivo,
      reservas.map((item) =>
        item.toJSON()
      )
    );

    return reserva;
  }

  async cancelar(
    id: string
  ): Promise<Reserva | null> {
    const reservas = await this.listarTodas();

    const reserva = reservas.find(
      (item) => item.id === id
    );

    if (!reserva) {
      return null;
    }

    reserva.cancelar();

    await this.salvarArquivo(
      this.caminhoArquivo,
      reservas.map((item) =>
        item.toJSON()
      )
    );

    return reserva;
  }

  /**
   * Verifica conflito de horário.
   */
  async existeConflito(
    salaId: string,
    data: string,
    horarioInicio: string,
    horarioFim: string
  ): Promise<boolean> {
    const reservas =
      await this.listarPorSala(salaId);

    return reservas.some(
      (reserva) =>
        reserva.status === "confirmada" &&
        reserva.data === data &&
        reserva.horarioInicio < horarioFim &&
        reserva.horarioFim > horarioInicio
    );
  }

  /**
   * Procura uma reserva ativa neste momento.
   */
  async buscarReservaAtiva(
    salaId: string,
    agora: Date
  ): Promise<Reserva | null> {
    const reservas =
      await this.listarPorSala(salaId);

    const ano = agora.getFullYear();
    const mes = String(
      agora.getMonth() + 1
    ).padStart(2, "0");
    const dia = String(
      agora.getDate()
    ).padStart(2, "0");

    const dataAtual =
      `${ano}-${mes}-${dia}`;

    const horaAtual =
      `${String(
        agora.getHours()
      ).padStart(2, "0")}:${String(
        agora.getMinutes()
      ).padStart(2, "0")}`;

    return (
      reservas.find(
        (reserva) =>
          reserva.status === "confirmada" &&
          reserva.data === dataAtual &&
          reserva.horarioInicio <= horaAtual &&
          reserva.horarioFim > horaAtual
      ) ?? null
    );
  }
}