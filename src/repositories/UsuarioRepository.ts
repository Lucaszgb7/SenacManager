import { resolve } from 'path';
import { Usuario } from '../models/Usuario';
import { Professor } from '../models/Professor';
import { Aluno } from '../models/Aluno';
import { Administrador } from '../models/Administrador';
import { BaseRepository } from './BaseRepository';

export class UsuarioRepository extends BaseRepository {
  private readonly caminhoArquivo = resolve(
    __dirname,
    "../../src/data",
    "usuarios.json"
  );

  constructor() {
    super();
  }

  /**
   * Constrói a instância correta conforme o `perfil` do JSON.
   * Centraliza a lógica que antes ficaria duplicada em cada método.
   */
  protected fromJSON(dados: any): Usuario {
    switch (dados.perfil) {
      case "professor":
        return Professor.fromJSON(dados);
      case "aluno":
        return Aluno.fromJSON(dados);
      case "admin":
        return Administrador.fromJSON(dados);
      default:
        throw new Error(`Perfil desconhecido em usuarios.json: ${dados.perfil}`);
    }
  }

  /**
   * Lista todos os usuários.
   */
  async listarTodos(): Promise<Usuario[]> {
    const dados = await this.lerArquivo(this.caminhoArquivo);
    return dados.map((item: any) => this.fromJSON(item));
  }

  /**
   * Busca por e-mail (case-insensitive).
   */
  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const usuarios = await this.listarTodos();
    const alvo = email.toLowerCase().trim();
    const encontrado = usuarios.find(
      (u) => u.email.toLowerCase() === alvo
    );
    return encontrado ?? null;
  }

  /**
   * Busca por id.
   */
  async buscarPorId(id: string): Promise<Usuario | null> {
    const usuarios = await this.listarTodos();
    const encontrado = usuarios.find((u) => u.id === id);
    return encontrado ?? null;
  }

  /**
   * Cria um novo usuário.
   */
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
