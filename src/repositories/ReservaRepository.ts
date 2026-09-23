import { resolve } from 'path';
import { Reserva } from '../models/Reserva';
import { BaseRepository } from './BaseRepository';

export class ReservaRepository extends BaseRepository {
  private readonly caminhoArquivo = resolve(__dirname, '../../src/data', 'reservas.json');

  constructor() {
    super();
  }

  protected fromJSON(dados: any): Reserva {
    return Reserva.fromJSON(dados);
  }

  async listarTodas(): Promise<Reserva[]> {
    return (await this.lerArquivo(this.caminhoArquivo)).map((dados) => this.fromJSON(dados));
  }

  async listarPorProfessor(professorId: string): Promise<Reserva[]> {
    return (await this.listarTodas()).filter((reserva) => reserva.professorId === professorId);
  }

  async listarPorSala(salaId: string): Promise<Reserva[]> {
    return (await this.listarTodas()).filter((reserva) => reserva.salaId === salaId);
  }

  async buscarPorId(id: string): Promise<Reserva | null> {
    return (await this.listarTodas()).find((reserva) => reserva.id === id) ?? null;
  }

  async criar(reserva: Reserva): Promise<Reserva> {
    const reservas = await this.listarTodas();
    reservas.push(reserva);
    await this.salvarArquivo(this.caminhoArquivo, reservas.map((item) => item.toJSON()));
    return reserva;
  }

  async cancelar(id: string): Promise<Reserva | null> {
    const reservas = await this.listarTodas();
    const reserva = reservas.find((item) => item.id === id);
    if (!reserva) return null;
    reserva.cancelar();
    await this.salvarArquivo(this.caminhoArquivo, reservas.map((item) => item.toJSON()));
    return reserva;
  }

  async existeConflito(salaId: string, data: string, horarioInicio: string, horarioFim: string): Promise<boolean> {
    return (await this.listarPorSala(salaId)).some((reserva) =>
      reserva.status === 'confirmada' &&
      reserva.data === data &&
      reserva.horarioInicio < horarioFim &&
      reserva.horarioFim > horarioInicio
    );
  }
}
