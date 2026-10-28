
import { randomUUID } from 'crypto'; // Importa a função utilizada para gerar identificadores únicos.

// ---------------------------------------------------------------------
// Tipos de perfil
// ---------------------------------------------------------------------

/**
 * Representa os perfis de usuário aceitos pelo sistema.
 * Os valores identificam os diferentes tipos de conta disponíveis.
 * O perfil 'admin' é mantido para garantir compatibilidade com dados antigos.
 */
export type PerfilUsuario =
  | 'professor'
  | 'aluno'
  | 'administrador'
  | 'admin';

// Mantém o nome Perfil como um alias de PerfilUsuario para preservar imports existentes.
export type Perfil = PerfilUsuario;

// ---------------------------------------------------------------------
// Classe base Usuario
// ---------------------------------------------------------------------

/**
 * Classe base abstrata dos usuários do SenacManager.
 * Centraliza os dados, as validações e os comportamentos
 * compartilhados por alunos, professores e administradores.
 *
 * A senha é armazenada somente como hash, nunca em texto puro.
 * A geração e a verificação do hash devem ser realizadas pela
 * camada de autenticação, utilizando uma biblioteca apropriada.
 */
export abstract class Usuario {
  // Indica se a conta está ativa; por padrão, todo usuário é criado ativo.
  public ativo = true;

  // ---------------------------------------------------------------------
  // Propriedades privadas
  // ---------------------------------------------------------------------

  // Identificador único utilizado para localizar o usuário.
  private _id: string;

  // Nome completo do usuário.
  private _nome: string;

  // Endereço de e-mail utilizado para identificar e contatar o usuário.
  private _email: string;

  // Hash da senha, armazenado para fins de autenticação.
  private _senhaHash: string;

  // Perfil do usuário, definido na criação e imutável durante a execução.
  private readonly _perfil: PerfilUsuario;

  // Data e horário em que a conta foi criada.
  private _criadoEm: Date;

  // Telefone de contato; pode ser null quando não estiver informado.
  private _telefone: string | null;

  // URL da foto de perfil; pode ser null quando não houver uma foto cadastrada.
  private _fotoUrl: string | null;

  // ---------------------------------------------------------------------
  // Construtor
  // ---------------------------------------------------------------------

  /**
   * Inicializa os dados comuns de um usuário.
   *
   * @param nome Nome completo do usuário.
   * @param email Endereço de e-mail do usuário.
   * @param senhaHash Hash da senha, nunca a senha em texto puro.
   * @param perfil Perfil associado à conta.
   * @param id Identificador opcional para preservar um registro existente.
   * @param criadoEm Data de criação opcional da conta.
   * @param telefone Telefone de contato opcional.
   * @param fotoUrl URL da foto de perfil opcional.
   */
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
    // Utiliza o ID recebido ou gera um novo identificador UUID.
    this._id = id ?? randomUUID();

    // Define o perfil informado pela subclasse, sem permitir sua reatribuição.
    this._perfil = perfil;

    // Inicializa os campos de texto antes de utilizar os setters de validação.
    this._nome = '';
    this._email = '';
    this._senhaHash = '';

    // Preserva a data de criação recebida ou utiliza a data atual.
    this._criadoEm = criadoEm ?? new Date();

    // Inicializa os campos complementares, utilizando null quando ausentes.
    this._telefone = telefone ?? null;
    this._fotoUrl = fotoUrl ?? null;

    // Define o nome utilizando o setter, que verifica o tamanho mínimo.
    this.nome = nome;

    // Define o e-mail utilizando o setter, que valida e normaliza o endereço.
    this.email = email;

    // Armazena o hash da senha após a validação de seu formato mínimo.
    this.senhaHash = senhaHash;

    // Valida a data de criação e cria uma cópia do objeto Date.
    this.criadoEm = this._criadoEm;

    // Normaliza o telefone e converte valores vazios em null.
    this.telefone = this._telefone;

    // Normaliza a URL da foto e converte valores vazios em null.
    this.fotoUrl = this._fotoUrl;
  }

  // ---------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------

  /**
   * Retorna o identificador único do usuário.
   */
  public get id(): string {
    return this._id;
  }

  /**
   * Retorna o nome do usuário.
   */
  public get nome(): string {
    return this._nome;
  }

  /**
   * Retorna o endereço de e-mail do usuário.
   */
  public get email(): string {
    return this._email;
  }

  /**
   * Retorna o hash da senha armazenado.
   * Esse valor não deve ser exposto desnecessariamente em respostas da API.
   */
  public get senhaHash(): string {
    return this._senhaHash;
  }

  /**
   * Retorna o perfil associado à conta.
   */
  public get perfil(): PerfilUsuario {
    return this._perfil;
  }

  /**
   * Retorna uma cópia da data de criação.
   * Evita que alterações externas no objeto Date modifiquem a data interna.
   */
  public get criadoEm(): Date {
    // Cria outro objeto Date utilizando o mesmo instante armazenado.
    return new Date(this._criadoEm.getTime());
  }

  /**
   * Retorna o telefone cadastrado ou null quando não estiver disponível.
   */
  public get telefone(): string | null {
    return this._telefone;
  }

  /**
   * Retorna a URL da foto de perfil ou null quando não houver uma foto.
   */
  public get fotoUrl(): string | null {
    return this._fotoUrl;
  }

  // ---------------------------------------------------------------------
  // Setters com validação
  // ---------------------------------------------------------------------

  /**
   * Define o nome do usuário.
   * Exige uma string com pelo menos três caracteres,
   * desconsiderando espaços no início e no final.
   */
  public set nome(valor: string) {
    // Verifica o tipo e o tamanho mínimo do nome informado.
    if (typeof valor !== 'string' || valor.trim().length < 3) {
      throw new Error('Nome deve ter pelo menos 3 caracteres.');
    }

    // Armazena o nome sem espaços desnecessários nas extremidades.
    this._nome = valor.trim();
  }

  /**
   * Define o e-mail do usuário.
   * Verifica um formato básico de endereço e padroniza as letras minúsculas.
   */
  public set email(valor: string) {
    // Expressão regular para verificar uma estrutura básica de e-mail.
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Rejeita valores que não sejam strings ou não correspondam ao formato.
    if (typeof valor !== 'string' || !regexEmail.test(valor.trim())) {
      throw new Error('E-mail inválido.');
    }

    // Remove espaços externos e converte o endereço para letras minúsculas.
    this._email = valor.trim().toLowerCase();
  }

  /**
   * Define o hash da senha.
   * Exige uma string com pelo menos vinte caracteres após remover espaços.
   * A validação não substitui a geração segura do hash na camada de autenticação.
   */
  public set senhaHash(valor: string) {
    // Verifica se o valor é uma string e possui o tamanho mínimo esperado.
    if (typeof valor !== 'string' || valor.trim().length < 20) {
      throw new Error(
        'Hash de senha inválido: deve ter pelo menos 20 caracteres.'
      );
    }

    // Armazena o hash sem espaços nas extremidades.
    this._senhaHash = valor.trim();
  }

  /**
   * Define a data de criação do usuário.
   * Aceita somente objetos Date que representem uma data válida.
   */
  public set criadoEm(valor: Date) {
    // Rejeita valores que não sejam Date ou que contenham uma data inválida.
    if (!(valor instanceof Date) || isNaN(valor.getTime())) {
      throw new Error('Data de criação inválida.');
    }

    // Armazena uma cópia para impedir alterações externas no objeto original.
    this._criadoEm = new Date(valor.getTime());
  }

  /**
   * Atualiza o telefone do usuário.
   * Aceita uma string ou null e converte valores vazios para null.
   */
  public set telefone(valor: string | null) {
    // Impede que valores de tipos inesperados sejam armazenados.
    if (valor !== null && typeof valor !== 'string') {
      throw new Error('Telefone inválido.');
    }

    // Remove espaços externos e utiliza null quando o valor estiver vazio.
    this._telefone = valor?.trim() || null;
  }

  /**
   * Atualiza a URL da foto de perfil.
   * Aceita uma string ou null e converte valores vazios para null.
   */
  public set fotoUrl(valor: string | null) {
    // Garante que o valor informado seja uma string ou null.
    if (valor !== null && typeof valor !== 'string') {
      throw new Error('URL da foto inválida.');
    }

    // Remove espaços externos e utiliza null quando a URL estiver vazia.
    this._fotoUrl = valor?.trim() || null;
  }

  // ---------------------------------------------------------------------
  // Serialização
  // ---------------------------------------------------------------------

  /**
   * Converte a instância do usuário em um objeto simples.
   * A data de criação é representada no formato ISO 8601.
   * Os campos complementares também são incluídos no resultado.
   *
   * @returns Objeto contendo os dados serializados do usuário.
   */
  public toJSON(): Record<string, unknown> {
    return {
      // Preserva o identificador único da conta.
      id: this._id,

      // Inclui o estado atual da conta.
      ativo: this.ativo,

      // Inclui os dados básicos de identificação do usuário.
      nome: this._nome,
      email: this._email,

      // Inclui o hash armazenado, que deve ser protegido ao expor dados pela API.
      senhaHash: this._senhaHash,

      // Registra o perfil utilizado para identificar o tipo de usuário.
      perfil: this._perfil,

      // Converte a data de criação para uma string padronizada ISO 8601.
      criadoEm: this._criadoEm.toISOString(),

      // Preserva o telefone cadastrado ou null.
      telefone: this._telefone,

      // Preserva a URL da foto de perfil ou null.
      fotoUrl: this._fotoUrl,
    };
  }

  /**
   * Reconstrói um usuário a partir de um objeto simples.
   * Este método deve ser implementado pelas subclasses concretas,
   * que conhecem os campos específicos de cada tipo de usuário.
   *
   * @param _data Objeto com os dados utilizados na reconstrução.
   * @returns Instância de uma subclasse concreta de Usuario.
   */
  public static fromJSON(_data: any): Usuario {
    // Impede a reconstrução genérica sem a implementação da subclasse.
    throw new Error(
      'fromJSON() deve ser implementado pela subclasse concreta.'
    );
  }
}
