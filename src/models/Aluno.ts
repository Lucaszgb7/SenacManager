
import { Usuario } from './Usuario';

/**
 * Representa um aluno do SenacManager.
 * Possui curso e turma como informações específicas.
 */
export class Aluno extends Usuario {
  // Armazena o curso e a turma associados ao aluno.
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
    // Define o perfil fixo do aluno.
    super(nome, email, senhaHash, 'aluno', id, criadoEm);

    // Inicializa os campos antes de aplicar as validações.
    this._curso = '';
    this._turma = '';

    // Utiliza os setters para validar e normalizar os valores.
    this.curso = curso;
    this.turma = turma;
  }

  // ---------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------

  public get curso(): string {
    return this._curso;
  }

  public get turma(): string {
    return this._turma;
  }

  // ---------------------------------------------------------------------
  // Setters com validação
  // ---------------------------------------------------------------------

  /**
   * Define o curso do aluno.
   * Exige uma string com pelo menos 2 caracteres,
   * desconsiderando espaços no início e no final.
   */
  public set curso(valor: string) {
    if (typeof valor !== 'string' || valor.trim().length < 2) {
      throw new Error('Curso deve ter pelo menos 2 caracteres.');
    }

    this._curso = valor.trim();
  }

  /**
   * Define a turma do aluno.
   * Não permite valores vazios e converte o texto para maiúsculas.
   */
  public set turma(valor: string) {
    if (typeof valor !== 'string' || valor.trim().length === 0) {
      throw new Error('Turma não pode ser vazia.');
    }

    this._turma = valor.trim().toUpperCase();
  }

  // ---------------------------------------------------------------------
  // Serialização
  // ---------------------------------------------------------------------

  /**
   * Converte o aluno em um objeto simples,
   * incluindo os dados herdados e suas informações acadêmicas.
   */
  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      curso: this._curso,
      turma: this._turma,
    };
  }

  /**
   * Reconstrói um aluno a partir de um objeto JSON.
   * Valida o perfil e restaura os dados acadêmicos e complementares.
   */
  public static fromJSON(data: any): Aluno {
    if (!data || typeof data !== 'object') {
      throw new Error('Dados inválidos para reconstruir Aluno.');
    }

    // Garante que o objeto recebido corresponde ao perfil de aluno.
    if (data.perfil !== 'aluno') {
      throw new Error('O perfil informado não corresponde a Aluno.');
    }

    // Reconstrói a instância e valida os campos acadêmicos.
    const aluno = new Aluno(
      data.nome,
      data.email,
      data.senhaHash,
      data.curso,
      data.turma,
      data.id,
      data.criadoEm ? new Date(data.criadoEm) : undefined
    );

    // Restaura os campos complementares do usuário.
    aluno.telefone = data.telefone ?? null;
    aluno.fotoUrl = data.fotoUrl ?? null;
    aluno.ativo = data.ativo !== false;

    return aluno;
  }
}
