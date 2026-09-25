import { Usuario } from '../models/Usuario';
import { BaseRepository } from './BaseRepository';
import { dataPath } from '../services/store';
import { userModel } from '../services/SchoolService';
export class UsuarioRepository extends BaseRepository {
  private get caminhoArquivo() { return dataPath('usuarios'); }
  protected fromJSON(dados: any): Usuario { return userModel(dados); }
  async listarTodos(): Promise<Usuario[]> { return (await this.lerArquivo(this.caminhoArquivo)).map(u => this.fromJSON(u)); }
  async buscarPorEmail(email: string): Promise<Usuario | null> { return (await this.listarTodos()).find(u => u.email === email.trim().toLowerCase()) || null; }
  async buscarPorId(id: string): Promise<Usuario | null> { return (await this.listarTodos()).find(u => u.id === id) || null; }
  async criar(usuario: Usuario): Promise<Usuario> {
    return this.transacao(async () => {
      const rows = await this.lerArquivo(this.caminhoArquivo);
      if (rows.some(u => u.id === usuario.id || u.email.trim().toLowerCase() === usuario.email)) throw new Error('Usuário já cadastrado.');
      await this.salvarArquivo(this.caminhoArquivo, [...rows, usuario.toJSON()]);
      return usuario;
    });
  }
  async atualizar(id: string, dados: Partial<Record<string, unknown>>): Promise<Usuario | null> {
    return this.transacao(async () => {
      const rows = await this.lerArquivo(this.caminhoArquivo);
      const existing = rows.find(u => u.id === id);
      if (!existing) return null;
      const merged = { ...existing, ...dados, id, perfil: existing.perfil };
      const usuario = this.fromJSON(merged);
      if (rows.some(u => u.id !== id && u.email.trim().toLowerCase() === usuario.email)) throw new Error('E-mail já cadastrado.');
      await this.salvarArquivo(this.caminhoArquivo, rows.map(u => u.id === id ? { ...merged, ...usuario.toJSON() } : u));
      return usuario;
    });
  }
  async remover(id: string): Promise<boolean> {
    return this.transacao(async () => {
      const rows = await this.lerArquivo(this.caminhoArquivo);
      if (!rows.some(u => u.id === id)) return false;
      await this.salvarArquivo(this.caminhoArquivo, rows.filter(u => u.id !== id));
      return true;
    });
  }
}
