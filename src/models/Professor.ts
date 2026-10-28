
import { Usuario } from './Usuario'; // Importa a classe base que contém os dados comuns dos usuários.

/**
 * Representa um professor do SenacManager.
 * Herda de Usuario informações como nome, e-mail, senha e identificador.
 * Também mantém uma lista das disciplinas que o professor leciona.
 */
export class Professor extends Usuario {
  // Armazena internamente as disciplinas associadas ao professor.
  private _disciplinas: string[];

  /**
   * Cria uma nova instância de professor.
   *
   * @param nome Nome completo do professor.
   * @param email Endereço de e-mail do professor.
   * @param senhaHash Hash da senha do professor.
   * @param disciplinas Lista inicial de disciplinas, vazia por padrão.
   * @param id Identificador opcional para preservar um registro existente.
   * @param criadoEm Data de criação opcional da conta.
   */
  constructor(
    nome: string,
    email: string,
    senhaHash: string,
    disciplinas: string[] = [],
    id?: string,
    criadoEm?: Date
  ) {
    // Define o perfil fixo como professor e inicializa os dados herdados.
    super(nome, email, senhaHash, 'professor', id, criadoEm);

    // Inicializa a lista interna antes de atribuir as disciplinas recebidas.
    this._disciplinas = [];

    // Utiliza o setter para validar os nomes e remover duplicatas.
    this.disciplinas = disciplinas;
  }

  // ---------------------------------------------------------------------
  // Getter e setter de disciplinas
  // ---------------------------------------------------------------------

  /**
   * Retorna a lista de disciplinas do professor.
   * Cria uma cópia do array para impedir alterações externas
   * diretamente sobre a lista armazenada na instância.
   *
   * @returns Cópia da lista de disciplinas.
   */
  public get disciplinas(): string[] {
    // Retorna uma nova lista sem expor o array interno.
    return [...this._disciplinas];
  }

  /**
   * Define as disciplinas que o professor leciona.
   * Valida cada elemento, remove espaços desnecessários
   * e elimina duplicatas sem diferenciar maiúsculas de minúsculas.
   *
   * @param valor Array contendo os nomes das disciplinas.
   * @throws Error Caso o valor não seja um array ou contenha nomes inválidos.
   */
  public set disciplinas(valor: string[]) {
    // Garante que o valor recebido seja uma lista.
    if (!Array.isArray(valor)) {
      throw new Error('Disciplinas deve ser um array de strings.');
    }

    // Armazena temporariamente as disciplinas já normalizadas.
    const normalizadas: string[] = [];

    // Registra as disciplinas já encontradas para evitar duplicatas.
    const vistas = new Set<string>();

    // Percorre cada disciplina informada para validar e normalizar seu nome.
    for (const disciplina of valor) {
      // Exige que cada elemento seja uma string com pelo menos dois caracteres.
      if (
        typeof disciplina !== 'string' ||
        disciplina.trim().length < 2
      ) {
        throw new Error(
          'Cada disciplina deve ter pelo menos 2 caracteres.'
        );
      }

      // Remove espaços desnecessários no início e no final do nome.
      const limpa = disciplina.trim();

      // Cria uma versão em minúsculas para comparar nomes sem diferenciar caixa.
      const chave = limpa.toLowerCase();

      // Adiciona somente disciplinas que ainda não foram registradas.
      if (!vistas.has(chave)) {
        // Marca o nome como encontrado para evitar repetições futuras.
        vistas.add(chave);

        // Preserva o nome normalizado na lista final.
        normalizadas.push(limpa);
      }
    }

    // Substitui a lista interna pela lista validada e sem duplicatas.
    this._disciplinas = normalizadas;
  }

  // ---------------------------------------------------------------------
  // Serialização
  // ---------------------------------------------------------------------

  /**
   * Converte a instância de Professor em um objeto simples.
   * Inclui os dados herdados de Usuario e a lista de disciplinas,
   * facilitando o armazenamento e a transferência dos dados.
   *
   * @returns Objeto com os dados serializados do professor.
   */
  public toJSON(): Record<string, unknown> {
    return {
      // Inclui os campos comuns definidos na classe Usuario.
      ...super.toJSON(),

      // Adiciona uma cópia da lista de disciplinas ao objeto serializado.
      disciplinas: [...this._disciplinas],
    };
  }

  /**
   * Reconstrói uma instância de Professor a partir de um objeto JSON.
   * Valida os dados recebidos, verifica o perfil e restaura
   * as disciplinas e os campos complementares do usuário.
   *
   * @param data Objeto contendo os dados serializados.
   * @returns Instância de Professor reconstruída.
   * @throws Error Caso os dados sejam inválidos ou o perfil seja incompatível.
   */
  public static fromJSON(data: any): Professor {
    // Verifica se os dados existem e se foram recebidos como um objeto.
    if (!data || typeof data !== 'object') {
      throw new Error('Dados inválidos para reconstruir Professor.');
    }

    // Impede que dados de outro tipo de usuário sejam carregados como professor.
    if (data.perfil !== undefined && data.perfil !== 'professor') {
      throw new Error('O perfil informado não corresponde a Professor.');
    }

    // Cria o professor com os dados recebidos.
    // O construtor também valida e normaliza a lista de disciplinas.
    const professor = new Professor(
      data.nome,
      data.email,
      data.senhaHash,
      data.disciplinas ?? [],
      data.id,
      data.criadoEm ? new Date(data.criadoEm) : undefined
    );

    // Restaura o telefone ou utiliza null caso o campo não esteja disponível.
    professor.telefone = data.telefone ?? null;

    // Restaura a URL da foto de perfil ou utiliza null como padrão.
    professor.fotoUrl = data.fotoUrl ?? null;

    // Preserva o estado da conta, considerando-a ativa por padrão.
    professor.ativo = data.ativo !== false;

    // Retorna a instância reconstruída com os dados restaurados.
    return professor;
  }
}
