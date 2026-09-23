import { randomUUID } from 'crypto';

export type StatusReserva = 'confirmada' | 'cancelada';

/**
 * Representa uma reserva avulsa de sala feita por um professor.
 * Diferente da AulaGrade, que é o cronograma fixo, esta reserva
 * refere-se a um uso pontual da sala em uma data específica.
 */
export class Reserva {
  private _id: string;
  private _salaId: string;
  private _professorId: string;
  private _disciplina: string;
  private _turma: string;
  private _data: string; // 'YYYY-MM-DD'
  private _horarioInicio: string; // 'HH:mm'
  private _horarioFim: string; // 'HH:mm'
  private _status: StatusReserva;
  private _criadoEm: Date;

  constructor(
    salaId: string,
    professorId: string,
    disciplina: string,
    turma: string,
    data: string,
    horarioInicio: string,
    horarioFim: string,
    status: StatusReserva = 'confirmada',
    id?: string,
    criadoEm?: Date
  ) {
    this._id = id ?? randomUUID();
    this._salaId = '';
    this._professorId = '';
    this._disciplina = '';
    this._turma = '';
    this._data = '';
    this._horarioInicio = '';
    this._horarioFim = '';
    this._status = 'confirmada';
    this._criadoEm = criadoEm ?? new Date();

    // Setters aplicam validação
    this.salaId = salaId;
    this.professorId = professorId;
    this.disciplina = disciplina;
    this.turma = turma;
    this.data = data;
    this.horarioInicio = horarioInicio;
    this.horarioFim = horarioFim;
    this.status = status;

    // Valida a regra cruzada (fim > início)
    this.validarIntervalo();
  }

  // ---------- Getters ----------

  get id(): string { return this._id; }
  get salaId(): string { return this._salaId; }
  get professorId(): string { return this._professorId; }
  get disciplina(): string { return this._disciplina; }
  get turma(): string { return this._turma; }
  get data(): string { return this._data; }
  get horarioInicio(): string { return this._horarioInicio; }
  get horarioFim(): string { return this._horarioFim; }
  get status(): StatusReserva { return this._status; }
  get criadoEm(): Date { return this._criadoEm; }

  // ---------- Setters com validação ----------

  set salaId(valor: string) {
    if (!valor || valor.trim().length < 1) {
      throw new Error('salaId é obrigatório.');
    }
    this._salaId = valor.trim();
  }

  set professorId(valor: string) {
    if (!valor || valor.trim().length < 1) {
      throw new Error('professorId é obrigatório.');
    }
    this._professorId = valor.trim();
  }

  set disciplina(valor: string) {
    if (!valor || valor.trim().length < 2) {
      throw new Error('Disciplina deve ter pelo menos 2 caracteres.');
    }
    this._disciplina = valor.trim();
  }

  set turma(valor: string) {
    if (!valor || valor.trim().length < 1) {
      throw new Error('Turma não pode ser vazia.');
    }
    this._turma = valor.trim().toUpperCase();
  }

  /**
   * Valida se a data está no formato 'YYYY-MM-DD' e se é uma data real.
   */
  set data(valor: string) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!valor || !regex.test(valor)) {
      throw new Error('Data deve estar no formato YYYY-MM-DD.');
    }
    const [ano = NaN, mes = NaN, dia = NaN] = valor.split('-').map(Number);
    const d = new Date(ano, mes - 1, dia);
    const valida =
      d.getFullYear() === ano &&
      d.getMonth() === mes - 1 &&
      d.getDate() === dia;
    if (!valida) {
      throw new Error('Data inválida.');
    }
    this._data = valor;
  }

  /**
   * Valida o formato HH:mm (24h).
   */
  set horarioInicio(valor: string) {
    if (!this.validarFormatoHora(valor)) {
      throw new Error('Horário de início inválido (use HH:mm).');
    }
    this._horarioInicio = valor;
  }

  set horarioFim(valor: string) {
    if (!this.validarFormatoHora(valor)) {
      throw new Error('Horário de fim inválido (use HH:mm).');
    }
    this._horarioFim = valor;
  }

  /**
   * Só aceita os dois status previstos pelo domínio.
   */
  set status(valor: StatusReserva) {
    if (valor !== 'confirmada' && valor !== 'cancelada') {
      throw new Error("Status deve ser 'confirmada' ou 'cancelada'.");
    }
    this._status = valor;
  }

  // ---------- Helpers ----------

  /**
   * Verifica se a string está no formato HH:mm entre 00:00 e 23:59.
   */
  private validarFormatoHora(valor: string): boolean {
    if (!valor || !/^\d{2}:\d{2}$/.test(valor)) return false;
    const [h = NaN, m = NaN] = valor.split(':').map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }

  /**
   * Converte 'HH:mm' em minutos desde a meia-noite, para comparação.
   */
  private minutosDoDia(horario: string): number {
    const [h = NaN, m = NaN] = horario.split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * Regra de negócio central: o horário de fim precisa ser
   * estritamente maior que o de início.
   */
  private validarIntervalo(): void {
    if (this.minutosDoDia(this._horarioFim) <= this.minutosDoDia(this._horarioInicio)) {
      throw new Error('Horário de fim deve ser depois do horário de início.');
    }
  }

  // ---------- Métodos de domínio ----------

  /**
   * Cancela a reserva. Não remove o registro — apenas marca o status
   * como 'cancelada', preservando histórico para auditoria.
   */
  cancelar(): void {
    this._status = 'cancelada';
  }

  // ---------- Serialização ----------

  toJSON(): Record<string, any> {
    return {
      id: this._id,
      salaId: this._salaId,
      professorId: this._professorId,
      disciplina: this._disciplina,
      turma: this._turma,
      data: this._data,
      horarioInicio: this._horarioInicio,
      horarioFim: this._horarioFim,
      status: this._status,
      criadoEm: this._criadoEm.toISOString(),
    };
  }

  /**
   * Reconstrói uma Reserva a partir de um objeto plano.
   */
  static fromJSON(data: any): Reserva {
    return new Reserva(
      data.salaId,
      data.professorId,
      data.disciplina,
      data.turma,
      data.data,
      data.horarioInicio,
      data.horarioFim,
      data.status ?? 'confirmada',
      data.id,
      data.criadoEm ? new Date(data.criadoEm) : undefined
    );
  }
}