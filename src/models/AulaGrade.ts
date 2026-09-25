import { randomUUID } from 'crypto';

export type DiaSemana =
  | 'segunda'
  | 'terca'
  | 'quarta'
  | 'quinta'
  | 'sexta'
  | 'sabado';

const DIAS_VALIDOS: DiaSemana[] = [
  'segunda',
  'terca',
  'quarta',
  'quinta',
  'sexta',
  'sabado',
];

/**
 * Representa uma aula fixa da grade curricular.
 * É o cronograma semanal regular que o aluno consulta — distinto
 * de uma Reserva, que é um uso pontual de sala em uma data específica.
 */
export class AulaGrade {
  private _id: string;
  private _disciplina: string;
  private _professorId: string;
  private _salaId: string;
  private _turma: string;
  private _diaSemana: DiaSemana;
  private _horarioInicio: string; // 'HH:mm'
  private _horarioFim: string; // 'HH:mm'
  private _isNoa: boolean; // "Noa" = aula sem aluno? ver nota abaixo

  constructor(
    disciplina: string,
    professorId: string,
    salaId: string,
    turma: string,
    diaSemana: DiaSemana,
    horarioInicio: string,
    horarioFim: string,
    isNoa: boolean = false,
    id?: string
  ) {
    this._id = id ?? randomUUID();
    this._disciplina = '';
    this._professorId = '';
    this._salaId = '';
    this._turma = '';
    this._diaSemana = 'segunda';
    this._horarioInicio = '';
    this._horarioFim = '';
    this._isNoa = false;

    this.disciplina = disciplina;
    this.professorId = professorId;
    this.salaId = salaId;
    this.turma = turma;
    this.diaSemana = diaSemana;
    this.horarioInicio = horarioInicio;
    this.horarioFim = horarioFim;
    this.isNoa = isNoa;

    this.validarIntervalo();
  }

  // ---------- Getters ----------

  get id(): string { return this._id; }
  get disciplina(): string { return this._disciplina; }
  get professorId(): string { return this._professorId; }
  get salaId(): string { return this._salaId; }
  get turma(): string { return this._turma; }
  get diaSemana(): DiaSemana { return this._diaSemana; }
  get horarioInicio(): string { return this._horarioInicio; }
  get horarioFim(): string { return this._horarioFim; }
  get isNoa(): boolean { return this._isNoa; }

  // ---------- Setters com validação ----------

  set disciplina(valor: string) {
    if (!valor || valor.trim().length < 2) {
      throw new Error('Disciplina deve ter pelo menos 2 caracteres.');
    }
    this._disciplina = valor.trim();
  }

  set professorId(valor: string) {
    if (!valor || valor.trim().length < 1) {
      throw new Error('professorId é obrigatório.');
    }
    this._professorId = valor.trim();
  }

  set salaId(valor: string) {
    if (!valor || valor.trim().length < 1) {
      throw new Error('salaId é obrigatório.');
    }
    this._salaId = valor.trim();
  }

  set turma(valor: string) {
    if (!valor || valor.trim().length < 1) {
      throw new Error('Turma não pode ser vazia.');
    }
    this._turma = valor.trim().toUpperCase();
  }

  /**
   * Só aceita dias da semana suportados pelo domínio.
   */
  set diaSemana(valor: DiaSemana) {
    if (!DIAS_VALIDOS.includes(valor)) {
      throw new Error(
        `Dia da semana inválido. Use um de: ${DIAS_VALIDOS.join(', ')}.`
      );
    }
    this._diaSemana = valor;
  }

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

  set isNoa(valor: boolean) {
    if (typeof valor !== 'boolean') {
      throw new Error('isNoa deve ser boolean.');
    }
    this._isNoa = valor;
  }

  // ---------- Helpers ----------

  private validarFormatoHora(valor: string): boolean {
    if (!valor || !/^\d{2}:\d{2}$/.test(valor)) return false;
    const [h = NaN, m = NaN] = valor.split(':').map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }

  private minutosDoDia(horario: string): number {
    const [h = NaN, m = NaN] = horario.split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * Garante que o horário de fim é posterior ao de início.
   */
  private validarIntervalo(): void {
    if (
      this.minutosDoDia(this._horarioFim) <=
      this.minutosDoDia(this._horarioInicio)
    ) {
      throw new Error('Horário de fim deve ser depois do horário de início.');
    }
  }

  // ---------- Serialização ----------

  toJSON(): Record<string, any> {
    return {
      id: this._id,
      disciplina: this._disciplina,
      professorId: this._professorId,
      salaId: this._salaId,
      turma: this._turma,
      diaSemana: this._diaSemana,
      horarioInicio: this._horarioInicio,
      horarioFim: this._horarioFim,
      isNoa: this._isNoa,
    };
  }

  /**
   * Reconstrói uma AulaGrade a partir de um objeto plano.
   */
  static fromJSON(data: any): AulaGrade {
    return new AulaGrade(
      data.disciplina,
      data.professorId,
      data.salaId,
      data.turma,
      data.diaSemana,
      data.horarioInicio ?? data.horaInicio,
      data.horarioFim ?? data.horaFim,
      data.isNoa ?? false,
      data.id
    );
  }
}