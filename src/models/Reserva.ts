
import { randomUUID } from 'crypto'; // Importa a função responsável por gerar identificadores únicos.

// Define os únicos status permitidos para uma reserva.
export type StatusReserva = 'confirmada' | 'cancelada';

/**
 * Representa uma reserva avulsa de sala feita por um professor.
 * Diferentemente de AulaGrade, que representa um cronograma semanal fixo,
 * Reserva registra a utilização pontual de uma sala em uma data específica.
 */
export class Reserva {
  // Identificador único utilizado para localizar a reserva.
  private _id: string;

  // Identificador da sala reservada.
  private _salaId: string;

  // Identificador do professor responsável pela reserva.
  private _professorId: string;

  // Nome da disciplina relacionada à reserva.
  private _disciplina: string;

  // Turma associada à utilização da sala.
  private _turma: string;

  // Data em que a reserva será realizada, no formato YYYY-MM-DD.
  private _data: string;

  // Horário de início da reserva, no formato HH:mm.
  private _horarioInicio: string;

  // Horário de término da reserva, no formato HH:mm.
  private _horarioFim: string;

  // Situação atual da reserva: confirmada ou cancelada.
  private _status: StatusReserva;

  // Data e horário em que o registro da reserva foi criado.
  private _criadoEm: Date;

  /**
   * Cria uma nova reserva e valida os dados informados.
   *
   * @param salaId Identificador da sala reservada.
   * @param professorId Identificador do professor responsável.
   * @param disciplina Nome da disciplina relacionada.
   * @param turma Turma que utilizará a sala.
   * @param data Data da reserva no formato YYYY-MM-DD.
   * @param horarioInicio Horário inicial no formato HH:mm.
   * @param horarioFim Horário final no formato HH:mm.
   * @param status Situação inicial da reserva, confirmada por padrão.
   * @param id Identificador opcional para preservar uma reserva existente.
   * @param criadoEm Data de criação opcional do registro.
   */
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
    // Reutiliza o identificador recebido ou gera um novo UUID.
    this._id = id ?? randomUUID();

    // Inicializa os campos antes de atribuir os valores validados.
    this._salaId = '';
    this._professorId = '';
    this._disciplina = '';
    this._turma = '';
    this._data = '';
    this._horarioInicio = '';
    this._horarioFim = '';

    // Define o status inicial como confirmado.
    this._status = 'confirmada';

    // Preserva a data de criação recebida ou utiliza a data atual.
    this._criadoEm = criadoEm ?? new Date();

    // Utiliza os setters para validar e normalizar os dados recebidos.
    this.salaId = salaId;
    this.professorId = professorId;
    this.disciplina = disciplina;
    this.turma = turma;
    this.data = data;
    this.horarioInicio = horarioInicio;
    this.horarioFim = horarioFim;
    this.status = status;

    // Verifica se o horário de término é posterior ao horário inicial.
    this.validarIntervalo();
  }

  // ---------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------

  // Retorna o identificador único da reserva.
  get id(): string { return this._id; }

  // Retorna o identificador da sala reservada.
  get salaId(): string { return this._salaId; }

  // Retorna o identificador do professor responsável.
  get professorId(): string { return this._professorId; }

  // Retorna o nome da disciplina relacionada.
  get disciplina(): string { return this._disciplina; }

  // Retorna a turma associada à reserva.
  get turma(): string { return this._turma; }

  // Retorna a data programada para a reserva.
  get data(): string { return this._data; }

  // Retorna o horário de início da reserva.
  get horarioInicio(): string { return this._horarioInicio; }

  // Retorna o horário de término da reserva.
  get horarioFim(): string { return this._horarioFim; }

  // Retorna o status atual da reserva.
  get status(): StatusReserva { return this._status; }

  // Retorna a data de criação do registro.
  get criadoEm(): Date { return this._criadoEm; }

  // ---------------------------------------------------------------------
  // Setters com validação
  // ---------------------------------------------------------------------

  /**
   * Define a sala reservada.
   * Exige um identificador não vazio.
   */
  set salaId(valor: string) {
    // Impede a criação de uma reserva sem identificação da sala.
    if (!valor || valor.trim().length < 1) {
      throw new Error('salaId é obrigatório.');
    }

    // Armazena o identificador sem espaços nas extremidades.
    this._salaId = valor.trim();
  }

  /**
   * Define o professor responsável pela reserva.
   * O identificador informado não pode estar vazio.
   */
  set professorId(valor: string) {
    // Verifica se o professor foi identificado corretamente.
    if (!valor || valor.trim().length < 1) {
      throw new Error('professorId é obrigatório.');
    }

    // Armazena o identificador sem espaços desnecessários.
    this._professorId = valor.trim();
  }

  /**
   * Define a disciplina relacionada à reserva.
   * Exige pelo menos dois caracteres após a remoção dos espaços externos.
   */
  set disciplina(valor: string) {
    // Impede que a disciplina seja vazia ou tenha um nome muito curto.
    if (!valor || valor.trim().length < 2) {
      throw new Error('Disciplina deve ter pelo menos 2 caracteres.');
    }

    // Normaliza o nome removendo espaços no início e no final.
    this._disciplina = valor.trim();
  }

  /**
   * Define a turma que utilizará a sala.
   * Não permite valores vazios e padroniza o texto em maiúsculas.
   */
  set turma(valor: string) {
    // Verifica se a turma foi informada.
    if (!valor || valor.trim().length < 1) {
      throw new Error('Turma não pode ser vazia.');
    }

    // Remove espaços externos e converte a identificação para maiúsculas.
    this._turma = valor.trim().toUpperCase();
  }

  /**
   * Define a data da reserva.
   * Aceita somente o formato YYYY-MM-DD e verifica se a data existe.
   */
  set data(valor: string) {
    // Define uma expressão regular para o formato ano-mês-dia.
    const regex = /^\d{4}-\d{2}-\d{2}$/;

    // Rejeita valores vazios ou que não correspondam ao formato esperado.
    if (!valor || !regex.test(valor)) {
      throw new Error('Data deve estar no formato YYYY-MM-DD.');
    }

    // Separa o ano, o mês e o dia e converte cada parte para número.
    const [ano = NaN, mes = NaN, dia = NaN] = valor.split('-').map(Number);

    // Cria uma data para verificar se os componentes correspondem a uma data real.
    const d = new Date(ano, mes - 1, dia);

    // Confere se o JavaScript preservou o ano, o mês e o dia informados.
    // Essa verificação evita aceitar datas inexistentes, como 31 de fevereiro.
    const valida =
      d.getFullYear() === ano &&
      d.getMonth() === mes - 1 &&
      d.getDate() === dia;

    // Interrompe a atribuição quando a data não existir no calendário.
    if (!valida) {
      throw new Error('Data inválida.');
    }

    // Armazena a data validada no formato original YYYY-MM-DD.
    this._data = valor;
  }

  /**
   * Define o horário de início da reserva.
   * O horário precisa respeitar o formato de 24 horas HH:mm.
   */
  set horarioInicio(valor: string) {
    // Verifica se o horário possui formato e valores válidos.
    if (!this.validarFormatoHora(valor)) {
      throw new Error('Horário de início inválido (use HH:mm).');
    }

    // Armazena o horário inicial validado.
    this._horarioInicio = valor;
  }

  /**
   * Define o horário de término da reserva.
   * O valor precisa respeitar o formato HH:mm.
   */
  set horarioFim(valor: string) {
    // Impede a atribuição de horários inválidos.
    if (!this.validarFormatoHora(valor)) {
      throw new Error('Horário de fim inválido (use HH:mm).');
    }

    // Armazena o horário final validado.
    this._horarioFim = valor;
  }

  /**
   * Define a situação da reserva.
   * Aceita somente os status confirmada e cancelada.
   */
  set status(valor: StatusReserva) {
    // Garante que o status pertença aos valores permitidos pelo domínio.
    if (valor !== 'confirmada' && valor !== 'cancelada') {
      throw new Error("Status deve ser 'confirmada' ou 'cancelada'.");
    }

    // Atualiza a situação da reserva após a validação.
    this._status = valor;
  }

  // ---------------------------------------------------------------------
  // Métodos auxiliares
  // ---------------------------------------------------------------------

  /**
   * Verifica se o horário está no formato HH:mm.
   * Também confere se as horas estão entre 00 e 23
   * e os minutos entre 00 e 59.
   *
   * @param valor Horário que será validado.
   * @returns true quando o horário for válido; caso contrário, false.
   */
  private validarFormatoHora(valor: string): boolean {
    // Exige dois dígitos para horas e minutos, separados por dois-pontos.
    if (!valor || !/^\d{2}:\d{2}$/.test(valor)) return false;

    // Separa as horas e os minutos e converte os valores para números.
    const [h = NaN, m = NaN] = valor.split(':').map(Number);

    // Aceita somente horários dentro dos limites do relógio de 24 horas.
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }

  /**
   * Converte um horário para a quantidade de minutos desde a meia-noite.
   * Facilita a comparação entre o início e o término da reserva.
   *
   * @param horario Horário no formato HH:mm.
   * @returns Quantidade total de minutos desde 00:00.
   */
  private minutosDoDia(horario: string): number {
    // Separa as horas e os minutos do horário informado.
    const [h = NaN, m = NaN] = horario.split(':').map(Number);

    // Converte as horas em minutos e soma os minutos restantes.
    return h * 60 + m;
  }

  /**
   * Valida a ordem dos horários da reserva.
   * O término deve ser estritamente posterior ao início.
   */
  private validarIntervalo(): void {
    // Converte os dois horários em minutos e verifica sua ordem.
    if (this.minutosDoDia(this._horarioFim) <= this.minutosDoDia(this._horarioInicio)) {
      // Impede reservas com duração zero ou horário final anterior ao inicial.
      throw new Error('Horário de fim deve ser depois do horário de início.');
    }
  }

  // ---------------------------------------------------------------------
  // Métodos de domínio
  // ---------------------------------------------------------------------

  /**
   * Cancela a reserva sem excluir seu registro.
   * A preservação do registro permite manter o histórico
   * e consultar cancelamentos posteriormente.
   */
  cancelar(): void {
    // Atualiza o status para cancelada, preservando os demais dados.
    this._status = 'cancelada';
  }

  // ---------------------------------------------------------------------
  // Serialização
  // ---------------------------------------------------------------------

  /**
   * Converte a reserva em um objeto simples, adequado para persistência JSON.
   * A data de criação é convertida para uma string ISO 8601.
   *
   * @returns Objeto contendo todos os dados da reserva.
   */
  toJSON(): Record<string, any> {
    return {
      // Preserva o identificador único da reserva.
      id: this._id,

      // Inclui os identificadores da sala e do professor responsável.
      salaId: this._salaId,
      professorId: this._professorId,

      // Registra a disciplina e a turma relacionadas à reserva.
      disciplina: this._disciplina,
      turma: this._turma,

      // Armazena a data e os horários da utilização da sala.
      data: this._data,
      horarioInicio: this._horarioInicio,
      horarioFim: this._horarioFim,

      // Preserva a situação atual da reserva.
      status: this._status,

      // Converte a data de criação para o formato ISO 8601.
      criadoEm: this._criadoEm.toISOString(),
    };
  }

  /**
   * Reconstrói uma instância de Reserva a partir de um objeto plano.
   * Aceita nomes alternativos para os campos de horário,
   * permitindo compatibilidade com dados que utilizem os nomes antigos.
   *
   * @param data Objeto contendo os dados serializados da reserva.
   * @returns Instância reconstruída após a validação dos dados.
   */
  static fromJSON(data: any): Reserva {
    // Repassa os dados ao construtor, que valida os campos recebidos.
    return new Reserva(
      data.salaId,
      data.professorId,
      data.disciplina,
      data.turma,
      data.data,

      // Prioriza horarioInicio e utiliza horaInicio como alternativa.
      data.horarioInicio ?? data.horaInicio,

      // Prioriza horarioFim e utiliza horaFim como alternativa.
      data.horarioFim ?? data.horaFim,

      // Utiliza confirmada quando o objeto não possuir um status informado.
      data.status ?? 'confirmada',

      // Preserva o identificador original, quando disponível.
      data.id,

      // Restaura a data de criação ou deixa o construtor utilizar a data atual.
      data.criadoEm ? new Date(data.criadoEm) : undefined
    );
  }
}
