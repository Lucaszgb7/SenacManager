import { Usuario, Perfil } from './Usuario';

/**
 * Representa um professor do SenacManager.
 * Possui como informação extra a lista de disciplinas que leciona.
 */
export class Professor extends Usuario {
  private _disciplinas: string[];

  constructor(
    nome: string,
    email: string,
    senhaHash: string,
    disciplinas: string[] = [],
    id?: string,
    criadoEm?: Date
  ) {
    // Perfil fixo: 'professor'
    super(nome, email, senhaHash, 'professor', id, criadoEm);
    this._disciplinas = [];
    this.disciplinas = disciplinas;
  }

  get disciplinas(): string[] {
    // Retorna cópia defensiva para evitar mutação externa direta
    return [...this._disciplinas];
  }

  /**
   * Valida se todas as disciplinas são strings não vazias.
   * Evita duplicatas (case-insensitive).
   */
  set disciplinas(valor: string[]) {
    if (!Array.isArray(valor)) {
      throw new Error('Disciplinas deve ser um array de strings.');
    }
    const normalizadas: string[] = [];
    for (const d of valor) {
      if (typeof d !== 'string' || d.trim().length < 2) {
        throw new Error('Cada disciplina deve ter pelo menos 2 caracteres.');
      }
      const limpa = d.trim();
      if (!normalizadas.some((x) => x.toLowerCase() === limpa.toLowerCase())) {
        normalizadas.push(limpa);
      }
    }
    this._disciplinas = normalizadas;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      disciplinas: this._disciplinas,
    };
  }

  /**
   * Reconstrói um Professor a partir de um objeto plano.
   */
  static fromJSON(data: any): Professor {
    const usuario = new Professor(
      data.nome,
      data.email,
      data.senhaHash,
      data.disciplinas ?? [],
      data.id,
      data.criadoEm ? new Date(data.criadoEm) : undefined
    );
    usuario.telefone = data.telefone ?? null;
    usuario.fotoUrl = data.fotoUrl ?? null;
    usuario.ativo = data.ativo !== false;
    return usuario;
  }
}