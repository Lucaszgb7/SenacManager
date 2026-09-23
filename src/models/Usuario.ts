// src/models/Usuario.ts
import { randomUUID } from 'crypto';

/**
 * Tipo que representa os perfis possíveis de usuário no sistema.
 * Usado para controle de acesso e diferenciação nas views.
 */
export type Perfil = 'professor' | 'aluno' | 'admin';

/**
 * Classe base abstrata Usuario.
 * Concentra os dados comuns a todos os tipos de usuário do sistema.
 * Não deve ser instanciada diretamente — use as subclasses Professor,
 * Aluno ou Administrador.
 */
export abstract class Usuario {
  private _id: string;
  private _nome: string;
  private _email: string;
  private _senhaHash: string;
  private _perfil: Perfil;
  private _criadoEm: Date;

  // ✅ ADICIONADOS: campos para telefone e foto de perfil.
  private _telefone: string | null;
  private _fotoUrl: string | null;

  constructor(
    nome: string,
    email: string,
    senhaHash: string,
    perfil: Perfil,
    id?: string,
    criadoEm?: Date,
    telefone?: string | null,
    fotoUrl?: string | null,
  ) {
    this._id = id ?? randomUUID();
    this._nome = '';
    this._email = '';
    this._senhaHash = '';
    this._perfil = perfil;
    this._criadoEm = criadoEm ?? new Date();

    // ✅ Atribui telefone e foto (aceita undefined → null).
    this._telefone = telefone ?? null;
    this._fotoUrl = fotoUrl ?? null;

    // Usa os setters para aproveitar as validações
    this.nome = nome;
    this.email = email;
    this.senhaHash = senhaHash;
  }

  // ---------- Getters ----------

  get id(): string {
    return this._id;
  }

  get nome(): string {
    return this._nome;
  }

  get email(): string {
    return this._email;
  }

  get senhaHash(): string {
    return this._senhaHash;
  }

  get perfil(): Perfil {
    return this._perfil;
  }

  get criadoEm(): Date {
    return this._criadoEm;
  }

  // ✅ Getters adicionados
  get telefone(): string | null {
    return this._telefone;
  }

  get fotoUrl(): string | null {
    return this._fotoUrl;
  }

  // ---------- Setters com validação ----------

  /**
   * Valida se o nome não está vazio e possui ao menos 3 caracteres.
   */
  set nome(valor: string) {
    if (!valor || valor.trim().length < 3) {
      throw new Error('Nome deve ter pelo menos 3 caracteres.');
    }
    this._nome = valor.trim();
  }

  /**
   * Valida se o e-mail segue um formato básico (algo@algo.algo).
   */
  set email(valor: string) {
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!valor || !regexEmail.test(valor)) {
      throw new Error('E-mail inválido.');
    }
    this._email = valor.toLowerCase().trim();
  }

  /**
   * Valida se o hash de senha foi informado.
   * IMPORTANTE: o Model nunca recebe a senha em texto puro —
   * apenas o hash já produzido pelo AuthController (bcrypt).
   */
  set senhaHash(valor: string) {
    if (!valor || valor.trim().length < 20) {
      throw new Error('Hash de senha inválido (muito curto).');
    }
    this._senhaHash = valor;
  }

  // ✅ Setters adicionados (permitem o ProfileController atualizar)
  set telefone(valor: string | null) {
    this._telefone = valor ? valor.trim() : null;
  }

  set fotoUrl(valor: string | null) {
    this._fotoUrl = valor ? valor.trim() : null;
  }

  // ---------- Serialização ----------

  /**
   * Converte a instância em um objeto plano, pronto para ser salvo
   * no arquivo .json. Datas são convertidas para ISO string.
   */
  toJSON(): Record<string, any> {
    return {
      id: this._id,
      nome: this._nome,
      email: this._email,
      senhaHash: this._senhaHash,
      perfil: this._perfil,
      criadoEm: this._criadoEm.toISOString(),
      // ✅ Agora serializa telefone e fotoUrl
      telefone: this._telefone,
      fotoUrl: this._fotoUrl,
    };
  }

  /**
   * Reconstrói uma instância a partir de um objeto plano lido do .json.
   * Deve ser sobrescrito nas subclasses para incluir campos específicos.
   */
  static fromJSON(_data: any): Usuario {
    throw new Error('fromJSON deve ser implementado nas subclasses.');
  }
}