
import { Usuario } from './Usuario';

/**
 * Representa um aluno do SenacManager.
 * Herda de Usuario os dados comuns, como nome, e-mail,
 * hash da senha, identificador e data de criação.
 *
 * Também armazena as informações acadêmicas específicas
 * do aluno: curso e turma.
 */
export class Aluno extends Usuario {
  // Armazena o curso associado ao aluno.
  private _curso: string;

  // Armazena a turma à qual o aluno pertence.
  private _turma: string;

  /**
   * Cria uma nova instância de aluno.
   *
   * @param nome Nome completo do aluno.
   * @param email Endereço de e-mail do aluno.
   * @param senhaHash Hash da senha do usuário.
   * @param curso Curso no qual o aluno está matriculado.
   * @param turma Identificação da turma do aluno.
   * @param id Identificador único opcional do aluno.
   * @param criadoEm Data de criação opcional da conta.
   */
  constructor(
    nome: string,
    email: string,
    senhaHash: string,
    curso: string,
    turma: string,
    id?: string,
    criadoEm?: Date
  ) {
    // Define o perfil fixo como aluno e encaminha os dados
    // compartilhados para o construtor da classe Usuario.
    super(nome, email, senhaHash, 'aluno', id, criadoEm);

    // Inicializa os atributos antes de aplicar as validações.
    this._curso = '';
    this._turma = '';

    // Utiliza os setters para validar e normalizar os dados recebidos.
    this.curso = curso;
    this.turma = turma;
  }

  // ---------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------

  /**
   * Retorna o curso associado ao aluno.
   * O acesso é feito por meio de um getter para encapsular o atributo.
   */
  public get curso(): string {
    return this._curso;
  }

  /**
   * Retorna a turma à qual o aluno pertence.
   */
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
   *
   * @param valor Nome do curso a ser associado ao aluno.
   * @throws Error Caso o valor seja inválido.
   */
  public set curso(valor: string) {
    // Impede valores que não sejam strings ou que tenham menos
    // de dois caracteres após a remoção dos espaços externos.
    if (typeof valor !== 'string' || valor.trim().length < 2) {
      throw new Error('Curso deve ter pelo menos 2 caracteres.');
    }

    // Armazena o curso sem espaços desnecessários nas extremidades.
    this._curso = valor.trim();
  }

  /**
   * Define a turma do aluno.
   * Não permite valores vazios e converte o texto para maiúsculas.
   *
   * @param valor Identificação da turma a ser atribuída.
   * @throws Error Caso o valor seja inválido.
   */
  public set turma(valor: string) {
    // Garante que a turma seja uma string não vazia.
    if (typeof valor !== 'string' || valor.trim().length === 0) {
      throw new Error('Turma não pode ser vazia.');
    }

    // Remove espaços externos e padroniza a identificação em maiúsculas.
    this._turma = valor.trim().toUpperCase();
  }

  // ---------------------------------------------------------------------
  // Serialização
  // ---------------------------------------------------------------------

  /**
   * Converte o aluno em um objeto simples, adequado para JSON.
   * Inclui os dados herdados de Usuario e as informações acadêmicas.
   *
   * @returns Objeto com os dados serializados do aluno.
   */
  public toJSON(): Record<string, unknown> {
    return {
      // Inclui os dados comuns, como nome, e-mail, perfil e ID.
      ...super.toJSON(),

      // Acrescenta as informações específicas do aluno.
      curso: this._curso,
      turma: this._turma,
    };
  }

  /**
   * Reconstrói uma instância de Aluno a partir de um objeto JSON.
   * Verifica a validade dos dados, confere o perfil e restaura
   * as informações acadêmicas e complementares.
   *
   * @param data Objeto com os dados previamente serializados.
   * @returns Instância de Aluno reconstruída.
   * @throws Error Caso os dados sejam inválidos ou o perfil seja incompatível.
   */
  public static fromJSON(data: any): Aluno {
    // Verifica se os dados recebidos existem e são um objeto válido.
    if (!data || typeof data !== 'object') {
      throw new Error('Dados inválidos para reconstruir Aluno.');
    }

    // Impede que dados de outro perfil sejam interpretados como aluno.
    if (data.perfil !== undefined && data.perfil !== 'aluno') {
      throw new Error('O perfil informado não corresponde a Aluno.');
    }

    // Reconstrói o aluno utilizando os dados recebidos.
    // A data de criação é convertida para Date quando está disponível.
    const aluno = new Aluno(
      data.nome,
      data.email,
      data.senhaHash,
      data.curso,
      data.turma,
      data.id,
      data.criadoEm ? new Date(data.criadoEm) : undefined
    );

    // Restaura o telefone ou utiliza null caso não exista um valor.
    aluno.telefone = data.telefone ?? null;

    // Restaura a URL da foto de perfil ou utiliza null como padrão.
    aluno.fotoUrl = data.fotoUrl ?? null;

    // Preserva o estado da conta, considerando-a ativa
    // quando o campo não existe ou não é explicitamente false.
    aluno.ativo = data.ativo !== false;

    // Retorna a instância completa do aluno.
    return aluno;
  }
}
