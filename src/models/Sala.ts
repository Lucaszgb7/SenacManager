import { randomUUID } from 'crypto';

/**
 * Representa uma sala física do SenacManager.
 * Uma sala possui capacidade, recursos (projetor, computadores etc.),
 * prédio e, opcionalmente, andar.
 */
export class Sala {
  private _id: string;
  private _nome: string;
  private _capacidade: number;
  private _recursos: string[];
  private _predio: string;
  private _andar: string | undefined;

  constructor(
    nome: string,
    capacidade: number,
    recursos: string[] = [],
    predio: string = '',
    andar?: string,
    id?: string
  ) {
    this._id = id ?? randomUUID();
    this._nome = '';
    this._capacidade = 0;
    this._recursos = [];
    this._predio = '';
    this._andar = undefined;

    // Usa setters para aproveitar as validações
    this.nome = nome;
    this.capacidade = capacidade;
    this.recursos = recursos;
    this.predio = predio;
    if (andar !== undefined) {
      this.andar = andar;
    }
  }

  // ---------- Getters ----------

  get id(): string {
    return this._id;
  }

  get nome(): string {
    return this._nome;
  }

  get capacidade(): number {
    return this._capacidade;
  }

  get recursos(): string[] {
    return [...this._recursos]; // cópia defensiva
  }

  get predio(): string {
    return this._predio;
  }

  get andar(): string | undefined {
    return this._andar;
  }

  // ---------- Setters com validação ----------

  /**
   * Valida se o nome da sala não está vazio.
   */
  set nome(valor: string) {
    if (!valor || valor.trim().length < 2) {
      throw new Error('Nome da sala deve ter pelo menos 2 caracteres.');
    }
    this._nome = valor.trim();
  }

  /**
   * Valida se a capacidade é um inteiro positivo (> 0).
   */
  set capacidade(valor: number) {
    if (!Number.isInteger(valor) || valor <= 0) {
      throw new Error('Capacidade deve ser um número inteiro positivo.');
    }
    this._capacidade = valor;
  }

  /**
   * Valida se os recursos são strings não vazias, sem duplicatas.
   */
  set recursos(valor: string[]) {
    if (!Array.isArray(valor)) {
      throw new Error('Recursos deve ser um array de strings.');
    }
    const normalizados: string[] = [];
    for (const r of valor) {
      if (typeof r !== 'string' || r.trim().length < 2) {
        throw new Error('Cada recurso deve ter pelo menos 2 caracteres.');
      }
      const limpo = r.trim().toLowerCase();
      if (!normalizados.includes(limpo)) {
        normalizados.push(limpo);
      }
    }
    this._recursos = normalizados;
  }

  /**
   * Valida se o prédio foi informado.
   */
  set predio(valor: string) {
    if (!valor || valor.trim().length < 1) {
      throw new Error('Prédio não pode ser vazio.');
    }
    this._predio = valor.trim();
  }

  /**
   * Andar é opcional, mas se informado não pode ser vazio.
   */
  set andar(valor: string | undefined) {
    if (valor === undefined || valor === null) {
      this._andar = undefined;
      return;
    }
    if (valor.trim().length < 1) {
      throw new Error('Andar não pode ser uma string vazia.');
    }
    this._andar = valor.trim();
  }

  // ---------- Serialização ----------

  toJSON(): Record<string, any> {
    const obj: Record<string, any> = {
      id: this._id,
      nome: this._nome,
      capacidade: this._capacidade,
      recursos: this._recursos,
      predio: this._predio,
    };
    if (this._andar !== undefined) {
      obj.andar = this._andar;
    }
    return obj;
  }

  /**
   * Reconstrói uma Sala a partir de um objeto plano lido do .json.
   */
  static fromJSON(data: any): Sala {
    return new Sala(
      data.nome,
      data.capacidade,
      data.recursos ?? [],
      data.predio,
      data.andar,
      data.id
    );
  }
}