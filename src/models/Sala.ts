
import { randomUUID } from 'crypto'; // Importa a função utilizada para gerar identificadores únicos.

/**
 * Representa uma sala física do SenacManager.
 * Armazena informações como nome, capacidade, recursos disponíveis,
 * prédio e andar, permitindo que esses dados sejam validados e persistidos.
 */
export class Sala {
  // Indica se a sala está ativa e disponível conforme as regras do sistema.
  ativa = true;

  // Identificador único da sala.
  private _id: string;

  // Nome utilizado para identificar a sala.
  private _nome: string;

  // Quantidade máxima de pessoas que a sala pode comportar.
  private _capacidade: number;

  // Lista de recursos disponíveis, como projetores e computadores.
  private _recursos: string[];

  // Nome do prédio em que a sala está localizada.
  private _predio: string;

  // Andar da sala, opcional quando essa informação não estiver disponível.
  private _andar: string | undefined;

  /**
   * Cria uma nova sala e inicializa suas propriedades.
   *
   * @param nome Nome da sala.
   * @param capacidade Quantidade máxima de pessoas permitida.
   * @param recursos Lista de recursos disponíveis, vazia por padrão.
   * @param predio Nome do prédio, com valor padrão vazio.
   * @param andar Andar da sala, opcional.
   * @param id Identificador opcional para preservar uma sala existente.
   */
  constructor(
    nome: string,
    capacidade: number,
    recursos: string[] = [],
    predio: string = '',
    andar?: string,
    id?: string
  ) {
    // Reutiliza o identificador recebido ou gera um novo UUID.
    this._id = id ?? randomUUID();

    // Inicializa as propriedades antes de atribuir os valores recebidos.
    this._nome = '';
    this._capacidade = 0;
    this._recursos = [];
    this._predio = '';
    this._andar = undefined;

    // Utiliza os setters para validar e normalizar os dados da sala.
    this.nome = nome;
    this.capacidade = capacidade;
    this.recursos = recursos;
    this.predio = predio;

    // Define o andar somente quando ele tiver sido informado.
    if (andar !== undefined) {
      this.andar = andar;
    }
  }

  // ---------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------

  /**
   * Retorna o identificador único da sala.
   */
  get id(): string {
    return this._id;
  }

  /**
   * Retorna o nome da sala.
   */
  get nome(): string {
    return this._nome;
  }

  /**
   * Retorna a capacidade máxima de pessoas da sala.
   */
  get capacidade(): number {
    return this._capacidade;
  }

  /**
   * Retorna uma cópia da lista de recursos.
   * Evita que alterações externas modifiquem diretamente a lista interna.
   */
  get recursos(): string[] {
    // Cria um novo array para preservar o encapsulamento dos dados.
    return [...this._recursos];
  }

  /**
   * Retorna o nome do prédio em que a sala está localizada.
   */
  get predio(): string {
    return this._predio;
  }

  /**
   * Retorna o andar da sala, caso tenha sido informado.
   */
  get andar(): string | undefined {
    return this._andar;
  }

  // ---------------------------------------------------------------------
  // Setters com validação
  // ---------------------------------------------------------------------

  /**
   * Define o nome da sala.
   * Exige pelo menos dois caracteres, desconsiderando espaços externos.
   */
  set nome(valor: string) {
    // Impede nomes vazios ou com menos de dois caracteres.
    if (!valor || valor.trim().length < 2) {
      throw new Error('Nome da sala deve ter pelo menos 2 caracteres.');
    }

    // Armazena o nome sem espaços desnecessários nas extremidades.
    this._nome = valor.trim();
  }

  /**
   * Define a capacidade máxima da sala.
   * Aceita somente números inteiros positivos.
   */
  set capacidade(valor: number) {
    // Verifica se a capacidade é inteira e maior que zero.
    if (!Number.isInteger(valor) || valor <= 0) {
      throw new Error('Capacidade deve ser um número inteiro positivo.');
    }

    // Armazena a capacidade após a validação.
    this._capacidade = valor;
  }

  /**
   * Define os recursos disponíveis na sala.
   * Cada recurso precisa ter pelo menos dois caracteres.
   * Os nomes são normalizados e as duplicatas são removidas.
   */
  set recursos(valor: string[]) {
    // Garante que os recursos tenham sido fornecidos em formato de array.
    if (!Array.isArray(valor)) {
      throw new Error('Recursos deve ser um array de strings.');
    }

    // Cria uma lista temporária para armazenar os recursos validados.
    const normalizados: string[] = [];

    // Percorre todos os recursos recebidos.
    for (const r of valor) {
      // Exige que cada recurso seja uma string com pelo menos dois caracteres.
      if (typeof r !== 'string' || r.trim().length < 2) {
        throw new Error('Cada recurso deve ter pelo menos 2 caracteres.');
      }

      // Remove espaços externos e converte o nome para letras minúsculas.
      const limpo = r.trim().toLowerCase();

      // Adiciona o recurso somente se ele ainda não estiver na lista.
      if (!normalizados.includes(limpo)) {
        normalizados.push(limpo);
      }
    }

    // Atualiza a lista interna com os recursos normalizados e sem duplicatas.
    this._recursos = normalizados;
  }

  /**
   * Define o prédio em que a sala está localizada.
   * O nome do prédio não pode ser vazio.
   */
  set predio(valor: string) {
    // Verifica se foi informado um nome válido para o prédio.
    if (!valor || valor.trim().length < 1) {
      throw new Error('Prédio não pode ser vazio.');
    }

    // Armazena o nome do prédio sem espaços externos.
    this._predio = valor.trim();
  }

  /**
   * Define o andar da sala.
   * O campo é opcional, mas não aceita uma string vazia quando informado.
   */
  set andar(valor: string | undefined) {
    // Permite remover a informação do andar usando undefined ou null.
    if (valor === undefined || valor === null) {
      this._andar = undefined;
      return;
    }

    // Impede que o andar seja definido como uma string vazia.
    if (valor.trim().length < 1) {
      throw new Error('Andar não pode ser uma string vazia.');
    }

    // Armazena o andar sem espaços desnecessários nas extremidades.
    this._andar = valor.trim();
  }

  // ---------------------------------------------------------------------
  // Serialização
  // ---------------------------------------------------------------------

  /**
   * Converte a sala em um objeto simples para armazenamento ou transferência.
   * O campo andar só é incluído quando possui um valor definido.
   *
   * @returns Objeto contendo os dados serializados da sala.
   */
  toJSON(): Record<string, any> {
    // Monta o objeto com os campos obrigatórios da sala.
    const obj: Record<string, any> = {
      // Preserva o identificador único da sala.
      id: this._id,

      // Registra se a sala está ativa.
      ativa: this.ativa,

      // Inclui o nome e a capacidade máxima.
      nome: this._nome,
      capacidade: this._capacidade,

      // Inclui os recursos disponíveis na sala.
      recursos: this._recursos,

      // Registra o prédio em que a sala está localizada.
      predio: this._predio,
    };

    // Adiciona o andar somente quando ele estiver definido.
    if (this._andar !== undefined) {
      obj.andar = this._andar;
    }

    // Retorna o objeto pronto para ser convertido em JSON.
    return obj;
  }

  /**
   * Reconstrói uma instância de Sala a partir de um objeto simples,
   * como os dados carregados de um arquivo JSON.
   *
   * @param data Objeto contendo os dados serializados da sala.
   * @returns Instância de Sala reconstruída.
   */
  static fromJSON(data: any): Sala {
    // Cria a sala usando o construtor, que valida os dados recebidos.
    const sala = new Sala(
      data.nome,
      data.capacidade,

      // Utiliza uma lista vazia caso os recursos não estejam presentes.
      data.recursos ?? [],

      // Restaura o prédio e o andar da sala.
      data.predio,
      data.andar,

      // Preserva o identificador original, quando informado.
      data.id
    );

    // Restaura o estado da sala, mantendo-a ativa por padrão.
    // Somente o valor false torna a sala inativa.
    sala.ativa = data.ativa !== false;

    // Retorna a instância reconstruída.
    return sala;
  }
}
