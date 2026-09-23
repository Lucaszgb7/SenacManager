import { Usuario } from './Usuario';

/**
 * Representa um aluno do SenacManager.
 * Possui curso e turma como informações específicas.
 */
export class Aluno extends Usuario {
  private _curso: string;
  private _turma: string;

  constructor(
    nome: string,
    email: string,
    senhaHash: string,
    curso: string,
    turma: string,
    id?: string,
    criadoEm?: Date
  ) {
    // Perfil fixo: 'aluno'
    super(nome, email, senhaHash, 'aluno', id, criadoEm);
    this._curso = '';
    this._turma = '';
    this.curso = curso;
    this.turma = turma;
  }

  get curso(): string {
    return this._curso;
  }

  get turma(): string {
    return this._turma;
  }

  /**
   * Valida se o curso é uma string não vazia.
   */
  set curso(valor: string) {
    if (!valor || valor.trim().length < 2) {
      throw new Error('Curso deve ter pelo menos 2 caracteres.');
    }
    this._curso = valor.trim();
  }

  /**
   * Valida se a turma é uma string não vazia.
   */
  set turma(valor: string) {
    if (!valor || valor.trim().length < 1) {
      throw new Error('Turma não pode ser vazia.');
    }
    this._turma = valor.trim().toUpperCase();
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      curso: this._curso,
      turma: this._turma,
    };
  }

  /**
   * Reconstrói um Aluno a partir de um objeto plano.
   */
  static fromJSON(data: any): Aluno {
    return new Aluno(
      data.nome,
      data.email,
      data.senhaHash,
      data.curso,
      data.turma,
      data.id,
      data.criadoEm ? new Date(data.criadoEm) : undefined
    );
  }
}