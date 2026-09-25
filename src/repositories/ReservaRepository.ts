import { Reserva } from '../models/Reserva';
import { BaseRepository } from './BaseRepository';
import { dataPath } from '../services/store';
export class ReservaRepository extends BaseRepository {
  private get caminhoArquivo() { return dataPath('reservas'); }
  protected fromJSON(dados: any): Reserva { return Reserva.fromJSON(dados); }
  async listarTodas(): Promise<Reserva[]> { return (await this.lerArquivo(this.caminhoArquivo)).map(r => this.fromJSON(r)); }
  async listarPorProfessor(id: string): Promise<Reserva[]> { return (await this.listarTodas()).filter(r => r.professorId === id); }
  async listarPorSala(id: string): Promise<Reserva[]> { return (await this.listarTodas()).filter(r => r.salaId === id); }
  async buscarPorId(id: string): Promise<Reserva | null> { return (await this.listarTodas()).find(r => r.id === id) || null; }
  async criar(reserva: Reserva): Promise<Reserva> {
    return this.transacao(async () => {
      const rows = await this.lerArquivo(this.caminhoArquivo);
      if (rows.some(r => r.id === reserva.id)) throw new Error('Identificador de reserva duplicado.');
      await this.salvarArquivo(this.caminhoArquivo, [...rows, reserva.toJSON()]);
      return reserva;
    });
  }
  async cancelar(id: string): Promise<Reserva | null> {
    return this.transacao(async () => {
      const rows = await this.lerArquivo(this.caminhoArquivo);
      const row = rows.find(r => r.id === id);
      if (!row) return null;
      row.status = 'cancelada';
      await this.salvarArquivo(this.caminhoArquivo, rows);
      return this.fromJSON(row);
    });
  }
  async existeConflito(salaId: string, data: string, inicio: string, fim: string): Promise<boolean> {
    return (await this.listarPorSala(salaId)).some(r => r.status === 'confirmada' && r.data === data && r.horarioInicio < fim && r.horarioFim > inicio);
  }
  async buscarReservaAtiva(salaId: string, agora: Date): Promise<Reserva | null> {
    const local = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(agora);
    const data = local.slice(0,10), hora = local.slice(11,16);
    return (await this.listarPorSala(salaId)).find(r => r.status === 'confirmada' && r.data === data && r.horarioInicio <= hora && r.horarioFim > hora) || null;
  }
}
