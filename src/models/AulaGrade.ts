
import { randomUUID } from 'crypto'; // Importa a função utilizada para gerar identificadores únicos.

// Define os dias da semana aceitos pelo sistema para cadastrar aulas fixas.
export type DiaSemana =
  | 'segunda'
  | 'terca'
  | 'quarta'
  | 'quinta'
  | 'sexta'
  | 'sabado';

// Lista os dias permitidos para validar o dia informado no cadastro da aula.
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
 * Armazena as informações da disciplina, do professor, da sala,
 * da turma, do dia da semana e do intervalo de horários.
 *
 * Diferentemente de uma Reserva, que representa uma utilização
 * pontual de sala, esta classe descreve o cronograma semanal regular.
 */
export class AulaGrade {
  // Identificador único da aula na grade curricular.
  private _id: string;

  // Nome da disciplina ministrada durante a aula.
  private _disciplina: string;

  // Identificador do professor responsável pela aula.
  private _professorId: string;

  // Identificador da sala em que a aula acontece.
  private _salaId: string;

  // Turma para a qual a aula está programada.
  private _turma: string;

  // Dia da semana em que a aula ocorre.
  private _diaSemana: DiaSemana;

  // Horário de início da aula, no formato HH:mm.
  private _horarioInicio: string;

  // Horário de término da aula, no formato HH:mm.
  private _horarioFim: string;

  // Indica se a aula está marcada como NOA.
  // O significado funcional dessa sigla depende da regra de negócio do sistema.
  private _isNoa: boolean;

  /**
   * Cria uma nova aula na grade curricular.
   *
   * @param disciplina Nome da disciplina.
   * @param professorId Identificador do professor responsável.
   * @param salaId Identificador da sala utilizada.
   * @param turma Turma vinculada à aula.
   * @param diaSemana Dia da semana em que a aula acontece.
   * @param horarioInicio Horário de início no formato HH:mm.
   * @param horarioFim Horário de término no formato HH:mm.
   * @param isNoa Indica se a aula possui a marcação NOA.
   * @param id Identificador opcional para preservar um ID existente.
   */
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
    // Reutiliza o identificador informado ou gera um novo UUID.
    this._id = id ?? randomUUID();

    // Inicializa as propriedades antes de aplicar as validações dos setters.
    this._disciplina = '';
    this._professorId = '';
    this._salaId = '';
    this._turma = '';
    this._diaSemana = 'segunda';
    this._horarioInicio = '';
    this._horarioFim = '';
    this._isNoa = false;

    // Atribui os dados usando os setters para validar e normalizar os valores.
    this.disciplina = disciplina;
    this.professorId = professorId;
    this.salaId = salaId;
    this.turma = turma;
    this.diaSemana = diaSemana;
    this.horarioInicio = horarioInicio;
    this.horarioFim = horarioFim;
    this.isNoa = isNoa;

    // Verifica se o horário final ocorre depois do horário inicial.
    this.validarIntervalo();
  }

  // ---------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------

  // Retorna o identificador único da aula.
  get id(): string { return this._id; }

  // Retorna o nome da disciplina.
  get disciplina(): string { return this._disciplina; }

  // Retorna o identificador do professor responsável.
  get professorId(): string { return this._professorId; }

  // Retorna o identificador da sala utilizada.
  get salaId(): string { return this._salaId; }

  // Retorna a turma associada à aula.
  get turma(): string { return this._turma; }

  // Retorna o dia da semana da aula.
  get diaSemana(): DiaSemana { return this._diaSemana; }

  // Retorna o horário de início da aula.
  get horarioInicio(): string { return this._horarioInicio; }

  // Retorna o horário de término da aula.
  get horarioFim(): string { return this._horarioFim; }

  // Retorna o estado da marcação NOA.
  get isNoa(): boolean { return this._isNoa; }

  // ---------------------------------------------------------------------
  // Setters com validação
  // ---------------------------------------------------------------------

  /**
   * Define a disciplina da aula.
   * Exige um texto com pelo menos dois caracteres.
   */
  set disciplina(valor: string) {
    // Impede disciplinas vazias ou com nomes muito curtos.
    if (!valor || valor.trim().length < 2) {
      throw new Error('Disciplina deve ter pelo menos 2 caracteres.');
    }

    // Remove espaços desnecessários no início e no final do nome.
    this._disciplina = valor.trim();
  }

  /**
   * Define o professor responsável pela aula.
   * O identificador não pode estar vazio.
   */
  set professorId(valor: string) {
    // Verifica se o identificador do professor foi informado.
    if (!valor || valor.trim().length < 1) {
      throw new Error('professorId é obrigatório.');
    }

    // Armazena o identificador sem espaços nas extremidades.
    this._professorId = valor.trim();
  }

  /**
   * Define a sala utilizada pela aula.
   * Exige um identificador não vazio.
   */
  set salaId(valor: string) {
    // Impede que a aula seja cadastrada sem uma sala identificada.
    if (!valor || valor.trim().length < 1) {
      throw new Error('salaId é obrigatório.');
    }

    // Armazena o identificador da sala sem espaços externos.
    this._salaId = valor.trim();
  }

  /**
   * Define a turma vinculada à aula.
   * Não permite valores vazios e padroniza o texto em maiúsculas.
   */
  set turma(valor: string) {
    // Verifica se a identificação da turma foi preenchida.
    if (!valor || valor.trim().length < 1) {
      throw new Error('Turma não pode ser vazia.');
    }

    // Normaliza a identificação da turma para manter um padrão.
    this._turma = valor.trim().toUpperCase();
  }

  /**
   * Define o dia da semana da aula.
   * Aceita somente os valores declarados em DIAS_VALIDOS.
   */
  set diaSemana(valor: DiaSemana) {
    // Impede a utilização de dias que não fazem parte do domínio.
    if (!DIAS_VALIDOS.includes(valor)) {
      throw new Error(
        `Dia da semana inválido. Use um de: ${DIAS_VALIDOS.join(', ')}.`
      );
    }

    // Armazena o dia validado.
    this._diaSemana = valor;
  }

  /**
   * Define o horário de início da aula.
   * O valor deve respeitar o formato HH:mm e representar uma hora válida.
   */
  set horarioInicio(valor: string) {
    // Valida o formato e os limites de hora e minuto.
    if (!this.validarFormatoHora(valor)) {
      throw new Error('Horário de início inválido (use HH:mm).');
    }

    // Armazena o horário de início validado.
    this._horarioInicio = valor;
  }

  /**
   * Define o horário de término da aula.
   * O valor deve respeitar o formato HH:mm e representar uma hora válida.
   */
  set horarioFim(valor: string) {
    // Valida o formato e os limites de hora e minuto.
    if (!this.validarFormatoHora(valor)) {
      throw new Error('Horário de fim inválido (use HH:mm).');
    }

    // Armazena o horário de término validado.
    this._horarioFim = valor;
  }

  /**
   * Define se a aula possui a marcação NOA.
   * Aceita somente valores booleanos.
   */
  set isNoa(valor: boolean) {
    // Impede valores como strings ou números no lugar de true/false.
    if (typeof valor !== 'boolean') {
      throw new Error('isNoa deve ser boolean.');
    }

    // Armazena o valor booleano recebido.
    this._isNoa = valor;
  }

  // ---------------------------------------------------------------------
  // Métodos auxiliares
  // ---------------------------------------------------------------------

  /**
   * Verifica se um horário está no formato HH:mm e é válido.
   *
   * @param valor Horário que será validado.
   * @returns true se a hora e os minutos estiverem dentro dos limites.
   */
  private validarFormatoHora(valor: string): boolean {
    // Exige dois dígitos para a hora, dois para os minutos e dois-pontos.
    if (!valor || !/^\d{2}:\d{2}$/.test(valor)) return false;

    // Separa o horário em horas e minutos e converte ambos para números.
    const [h = NaN, m = NaN] = valor.split(':').map(Number);

    // Aceita horas entre 00 e 23 e minutos entre 00 e 59.
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }

  /**
   * Converte um horário para a quantidade de minutos desde a meia-noite.
   * Essa conversão facilita a comparação entre horários.
   *
   * @param horario Horário no formato HH:mm.
   * @returns Total de minutos desde 00:00.
   */
  private minutosDoDia(horario: string): number {
    // Separa as horas e os minutos e converte os valores para números.
    const [h = NaN, m = NaN] = horario.split(':').map(Number);

    // Soma os minutos das horas completas aos minutos restantes.
    return h * 60 + m;
  }

  /**
   * Garante que o horário de término seja posterior ao de início.
   * Impede aulas com duração igual a zero ou intervalo invertido.
   */
  private validarIntervalo(): void {
    // Converte os dois horários para minutos e compara seus valores.
    if (
      this.minutosDoDia(this._horarioFim) <=
      this.minutosDoDia(this._horarioInicio)
    ) {
      // Interrompe a criação da aula se o intervalo for inválido.
      throw new Error('Horário de fim deve ser depois do horário de início.');
    }
  }

  // ---------------------------------------------------------------------
  // Serialização
  // ---------------------------------------------------------------------

  /**
   * Converte a aula em um objeto simples, adequado para persistência JSON.
   * Inclui todos os dados necessários para reconstruir a aula posteriormente.
   *
   * @returns Objeto contendo os dados da aula.
   */
  toJSON(): Record<string, any> {
    return {
      // Preserva o identificador único da aula.
      id: this._id,

      // Inclui a disciplina e os identificadores relacionados.
      disciplina: this._disciplina,
      professorId: this._professorId,
      salaId: this._salaId,

      // Registra a turma e o dia em que a aula acontece.
      turma: this._turma,
      diaSemana: this._diaSemana,

      // Armazena os horários no formato HH:mm.
      horarioInicio: this._horarioInicio,
      horarioFim: this._horarioFim,

      // Preserva a marcação NOA.
      isNoa: this._isNoa,
    };
  }

  /**
   * Reconstrói uma instância de AulaGrade a partir de um objeto plano.
   * Também aceita os nomes horaInicio e horaFim como alternativas
   * aos campos horarioInicio e horarioFim, para compatibilidade com dados antigos.
   *
   * @param data Objeto contendo os dados da aula.
   * @returns Instância de AulaGrade reconstruída.
   */
  static fromJSON(data: any): AulaGrade {
    // Repassa os dados ao construtor, que executa as validações da classe.
    return new AulaGrade(
      data.disciplina,
      data.professorId,
      data.salaId,
      data.turma,
      data.diaSemana,

      // Prioriza o nome atual do campo e usa o nome alternativo se necessário.
      data.horarioInicio ?? data.horaInicio,
      data.horarioFim ?? data.horaFim,

      // Usa false quando a marcação NOA não estiver presente nos dados.
      data.isNoa ?? false,

      // Preserva o identificador existente, quando informado.
      data.id
    );
  }
}
