// src/repositories/UsuarioRepository.ts
import { resolve } from "path";

import { Usuario, Perfil } from "../models/Usuario";
import { Professor } from "../models/Professor";
import { Aluno } from "../models/Aluno";
import { Administrador } from "../models/Administrador";
import { BaseRepository } from "./BaseRepository";

/**
 * Repository de Usuários — persiste em arquivo JSON.
 *
 * Observações do projeto:
 * - Instanciável (não estático).
 * - IDs são STRING.
 * - Serialização via toJSON()/fromJSON() dos Models.
 */
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
    const usuarios = await this.listarTodos();
    usuarios.push(usuario);

    await this.salvarArquivo(
      this.caminhoArquivo,
      usuarios.map((u) => u.toJSON())
    );

    return usuario;
  }

  /**
   * Atualiza campos do usuário pelo id.
   * SEGURANÇA: nunca permite alterar `id` nem `perfil` por aqui.
   * Retorna a instância atualizada, ou null se o usuário não existir.
   */
  async atualizar(
    id: string,
    dados: Partial<Record<string, unknown>>
  ): Promise<Usuario | null> {
    const usuarios = await this.listarTodos();

    const idx = usuarios.findIndex((u) => u.id === id);
    if (idx === -1) {
      return null;
    }

    // Extrai a instância existente para uma variável local.
    // Isso resolve o TS2532 ("Possivelmente, o objeto é 'nulo'"),
    // porque o TS não confia em `usuarios[idx]` sem um guard explícito.
    const usuarioExistente = usuarios[idx];
    if (!usuarioExistente) {
      return null;
    }

    // SEGURANÇA: remove campos que NUNCA devem ser atualizados por aqui.
    // A whitelist do controller já filtra, mas reforçamos aqui.
    const {
      id: _ignoraId,
      perfil: _ignoraPerfil,
      ...permitidos
    } = dados as Record<string, unknown>;

    const atualizadoPlano = {
      ...usuarioExistente.toJSON(),
      ...permitidos,
    };

    // Reconstrói a instância a partir do plano atualizado.
    // (fromJSON já valida e normaliza os campos.)
    let atualizadoInstancia: Usuario;
    try {
      atualizadoInstancia = this.fromJSON(atualizadoPlano);
    } catch (err) {
      // Se a validação do Model falhar (ex.: e-mail inválido), propagamos
      // o erro para o controller poder responder 400 em vez de 500.
      throw err;
    }

    usuarios[idx] = atualizadoInstancia;

    await this.salvarArquivo(
      this.caminhoArquivo,
      usuarios.map((u) => u.toJSON())
    );

    return atualizadoInstancia;
  }

  /**
   * Remove um usuário. Retorna true se removeu, false se não existia.
   * (Não usado ainda, mas útil para o painel admin no futuro.)
   */
  async remover(id: string): Promise<boolean> {
    const usuarios = await this.listarTodos();
    const filtrados = usuarios.filter((u) => u.id !== id);

    if (filtrados.length === usuarios.length) {
      return false;
    }

    await this.salvarArquivo(
      this.caminhoArquivo,
      filtrados.map((u) => u.toJSON())
    );

    return true;
  }
}