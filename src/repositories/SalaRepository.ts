import { Sala } from '../models/Sala';
import { BaseRepository } from './BaseRepository';
import { ReservaRepository } from './ReservaRepository';
export class SalaRepository extends BaseRepository {
  protected fromJSON(dados: any): Sala { return Sala.fromJSON(dados); }
  async listarTodas(): Promise<Sala[]> { return (await this.lerArquivo('salas')).map(r => this.fromJSON(r)); }
  async buscarPorId(id: string): Promise<Sala | null> { return (await this.listarTodas()).find(s => s.id === id) || null; }
  async criar(sala: Sala): Promise<Sala> {
    return this.transacao(async () => {
      const rows = await this.lerArquivo('salas');
      if (rows.some(r => r.id === sala.id)) throw new Error('Sala já cadastrada.');
      await this.salvarArquivo('salas', [...rows, sala.toJSON()]);
      return sala;
    });
  }
  async atualizar(id: string, dados: Record<string, unknown>): Promise<Sala | null> {
    return this.transacao(async () => {
      const rows = await this.lerArquivo('salas');
      const existing = rows.find(r => r.id === id);
      if (!existing) return null;
      const merged = { ...existing, ...dados, id };
      const sala = this.fromJSON(merged);
      await this.salvarArquivo('salas', rows.map(r => r.id === id ? { ...merged, ...sala.toJSON() } : r));
      return sala;
    });
  }
  async remover(id: string): Promise<boolean> {
    return this.transacao(async () => {
      const rows = await this.lerArquivo('salas');
      if (!rows.some(r => r.id === id)) return false;
      await this.salvarArquivo('salas', rows.filter(r => r.id !== id));
      return true;
    });
  }
  async listarDisponiveis(data: string, inicio: string, fim: string): Promise<Sala[]> {
    const salas = (await this.listarTodas()).filter(s => s.ativa);
    const repo = new ReservaRepository();
    const conflicts = await Promise.all(salas.map(s => repo.existeConflito(s.id, data, inicio, fim)));
    return salas.filter((_, i) => !conflicts[i]);
  }
}
