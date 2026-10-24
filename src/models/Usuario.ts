
import { randomUUID } from 'crypto';

/**
 * Representa os perfis de usuário aceitos pelo sistema.
 * 'admin' é mantido para compatibilidade com dados existentes.
 */
export type PerfilUsuario =
  | 'professor'
  | 'aluno'
  | 'administrador'
  | 'admin';

// Mantém o nome Perfil para compatibilidade com imports existentes.
export type Perfil = PerfilUsuario;

/**
 * Classe base abstrata dos usuários do SenacManager.
 * Centraliza os dados, as validações e a serialização
 * compartilhados por alunos, professores e administradores.
 *
 * A senha é armazenada somente como hash.
 * A geração e a verificação do hash devem ser feitas pela
 * camada de autenticação, utilizando uma biblioteca apropriada.
 */
export abstract class Usuario {
  // Indica se a conta está ativa.
  public ativo = true;

  // ---------------------------------------------------------------------
  // Propriedades privadas
  // ---------------------------------------------------------------------

  private _id: string;
  private _nome: string;
  private _email: string;
  private _senhaHash: string;
  private readonly _perfil: PerfilUsuario;
  private _criadoEm: Date;
  private _telefone: string | null;
  private _fotoUrl: string | null;

  // ---------------------------------------------------------------------
  // Construtor
  // ---------------------------------------------------------------------

  constructor(
    nome: string,
    email: string,
    senhaHash: string,
    perfil: PerfilUsuario,
    id?: string,
    criadoEm?: Date,
    telefone?: string | null,
    fotoUrl?: string | null
  ) {
    // Utiliza o ID informado ou gera um identificador único.
    this._id = id ?? randomUUID();

    // O perfil é definido pela subclasse e não pode ser alterado.
    this._perfil = perfil;

    // Inicializa os campos antes de aplicar as validações.
    this._nome = '';
    this._email = '';
    this._senhaHash = '';
    this._criadoEm = criadoEm ?? new Date();
    this._telefone = telefone ?? null;
    this._fotoUrl = fotoUrl ?? null;

    // Utiliza os setters para validar os dados recebidos.
    this.nome = nome;
    this.email = email;
    this.senhaHash = senhaHash;

    // Valida a data de criação fornecida.
    this.criadoEm = this._criadoEm;

    // Normaliza os campos complementares.
    this.telefone = this._telefone;
    this.fotoUrl = this._fotoUrl;
  }

  // ---------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------

  public get id(): string {
    return this._id;
  }

  public get nome(): string {
    return this._nome;
  }

  public get email(): string {
    return this._email;
  }

  public get senhaHash(): string {
    return this._senhaHash;
  }

  public get perfil(): PerfilUsuario {
    return this._perfil;
  }

  public get criadoEm(): Date {
    // Retorna uma cópia para evitar alterações externas na data interna.
    return new Date(this._criadoEm.getTime());
  }

  public get telefone(): string | null {
    return this._telefone;
  }

  public get fotoUrl(): string | null {
    return this._fotoUrl;
  }

  // ---------------------------------------------------------------------
  // Setters com validação
  // ---------------------------------------------------------------------

  /**
   * Define o nome do usuário.
   * Aceita somente strings com pelo menos 3 caracteres,
   * desconsiderando espaços no início e no final.
   */
  public set nome(valor: string) {
    if (typeof valor !== 'string' || valor.trim().length < 3) {
      throw new Error('Nome deve ter pelo menos 3 caracteres.');
    }

    this._nome = valor.trim();
  }

  /**
   * Define o e-mail do usuário.
   * Verifica o formato básico e armazena o endereço em minúsculas.
   */
  public set email(valor: string) {
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (typeof valor !== 'string' || !regexEmail.test(valor.trim())) {
      throw new Error('E-mail inválido.');
    }

    this._email = valor.trim().toLowerCase();
  }

  /**
   * Define o hash da senha.
   * Não aceita valores que não sejam strings com pelo menos
   * 20 caracteres após a remoção dos espaços externos.
   */
  public set senhaHash(valor: string) {
    if (typeof valor !== 'string' || valor.trim().length < 20) {
      throw new Error(
        'Hash de senha inválido: deve ter pelo menos 20 caracteres.'
      );
    }

    this._senhaHash = valor.trim();
  }

  /**
   * Define a data de criação.
   * Aceita somente objetos Date com uma data válida.
   */
  public set criadoEm(valor: Date) {
    if (!(valor instanceof Date) || isNaN(valor.getTime())) {
      throw new Error('Data de criação inválida.');
    }

    this._criadoEm = new Date(valor.getTime());
  }

  /**
   * Atualiza o telefone do usuário.
   * Converte valores vazios ou nulos para null.
   */
  public set telefone(valor: string | null) {
    if (valor !== null && typeof valor !== 'string') {
      throw new Error('Telefone inválido.');
    }

    this._telefone = valor?.trim() || null;
  }

  /**
   * Atualiza a URL da foto de perfil.
   * Converte valores vazios ou nulos para null.
   */
  public set fotoUrl(valor: string | null) {
    if (valor !== null && typeof valor !== 'string') {
      throw new Error('URL da foto inválida.');
    }

    this._fotoUrl = valor?.trim() || null;
  }

  // ---------------------------------------------------------------------
  // Serialização
  // ---------------------------------------------------------------------

  /**
   * Converte o usuário em um objeto simples, pronto para persistência.
   * A data de criação é convertida para ISO 8601.
   * Os campos complementares são preservados no JSON.
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      ativo: this.ativo,
      nome: this._nome,
      email: this._email,
      senhaHash: this._senhaHash,
      perfil: this._perfil,
      criadoEm: this._criadoEm.toISOString(),
      telefone: this._telefone,
      fotoUrl: this._fotoUrl,
    };
  }

  /**
   * Método estático que deve ser implementado pelas subclasses.
   * Cada classe concreta é responsável por reconstruir seus próprios dados.
   */
  public static fromJSON(_data: any): Usuario {
    throw new Error(
      'fromJSON() deve ser implementado pela subclasse concreta.'
    );
  }
}
