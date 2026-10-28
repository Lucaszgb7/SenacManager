
import { Reserva } from '../models/Reserva'; // Importa o modelo Reserva, que representa as reservas de salas.
import { BaseRepository } from './BaseRepository'; // Importa a classe base com as operações de leitura, escrita e transação.

// ---------------------------------------------------------------------
// Repositório de reservas
// ---------------------------------------------------------------------

/**
 * Gerencia o acesso e a persistência dos dados das reservas.
 *
 * Centraliza as operações de consulta, criação e cancelamento,
 * além da verificação de conflitos de horários e da busca
 * por reservas que estejam em andamento.
 *
 * Os dados são armazenados na coleção "reservas".
 */
export class ReservaRepository extends BaseRepository {

  // ---------------------------------------------------------------------
  // Conversão de dados
  // ---------------------------------------------------------------------

  /**
   * Converte um objeto simples em uma instância da classe Reserva.
   *
   * @param dados Objeto contendo os dados de uma reserva.
   * @returns Instância de Reserva reconstruída a partir dos dados.
   */
  protected fromJSON(dados: any): Reserva {
    // Utiliza o método do modelo para reconstruir e validar a reserva.
    return Reserva.fromJSON(dados);
  }

  // ---------------------------------------------------------------------
  // Consultas de reservas
  // ---------------------------------------------------------------------

  /**
   * Lista todas as reservas armazenadas no sistema.
   *
   * @returns Lista de reservas convertidas em instâncias do modelo.
   */
  async listarTodas(): Promise<Reserva[]> {
    // Lê os registros da coleção e converte cada um em uma instância de Reserva.
    return (await this.lerArquivo('reservas')).map(r => this.fromJSON(r));
  }

  /**
   * Lista as reservas realizadas por um professor específico.
   *
   * @param id Identificador único do professor.
   * @returns Reservas associadas ao professor informado.
   */
  async listarPorProfessor(id: string): Promise<Reserva[]> {
    // Obtém todas as reservas e mantém somente as vinculadas ao professor.
    return (await this.listarTodas()).filter(r => r.professorId === id);
  }

  /**
   * Lista as reservas associadas a uma sala específica.
   *
   * @param id Identificador único da sala.
   * @returns Reservas vinculadas à sala informada.
   */
  async listarPorSala(id: string): Promise<Reserva[]> {
    // Filtra as reservas utilizando o identificador da sala.
    return (await this.listarTodas()).filter(r => r.salaId === id);
  }

  /**
   * Busca uma reserva pelo seu identificador.
   *
   * @param id Identificador único da reserva.
   * @returns A reserva encontrada ou null caso não exista.
   */
  async buscarPorId(id: string): Promise<Reserva | null> {
    // Procura a reserva correspondente e retorna null se não houver resultado.
    return (await this.listarTodas()).find(r => r.id === id) || null;
  }

  // ---------------------------------------------------------------------
  // Criação de reservas
  // ---------------------------------------------------------------------

  /**
   * Cadastra uma nova reserva no sistema.
   *
   * A operação é executada dentro de uma transação para
   * manter a consistência durante a atualização dos dados.
   *
   * @param reserva Instância da reserva que será cadastrada.
   * @returns A própria reserva após a persistência.
   * @throws Error Caso já exista uma reserva com o mesmo identificador.
   */
  async criar(reserva: Reserva): Promise<Reserva> {
    // Executa a operação dentro do mecanismo de transação do repositório.
    return this.transacao(async () => {

      // Lê os registros atuais antes de adicionar a nova reserva.
      const rows = await this.lerArquivo('reservas');

      // Impede o cadastro de outra reserva com o mesmo identificador.
      if (rows.some(r => r.id === reserva.id)) {
        throw new Error('Identificador de reserva duplicado.');
      }

      // Cria uma nova lista com os registros existentes e a nova reserva serializada.
      await this.salvarArquivo('reservas', [...rows, reserva.toJSON()]);

      // Retorna a instância cadastrada para o código que chamou o método.
      return reserva;
    });
  }

  // ---------------------------------------------------------------------
  // Cancelamento de reservas
  // ---------------------------------------------------------------------

  /**
   * Cancela uma reserva existente.
   *
   * O registro não é removido: seu status é alterado para
   * "cancelada", preservando o histórico da operação.
   *
   * @param id Identificador da reserva que será cancelada.
   * @returns A reserva atualizada ou null caso ela não exista.
   */
  async cancelar(id: string): Promise<Reserva | null> {
    // Executa o cancelamento dentro de uma transação.
    return this.transacao(async () => {

      // Lê todos os registros atuais da coleção de reservas.
      const rows = await this.lerArquivo('reservas');

      // Procura o registro que possui o identificador informado.
      const row = rows.find(r => r.id === id);

      // Encerra a operação sem alterações quando a reserva não existe.
      if (!row) {
        return null;
      }

      // Atualiza o status para indicar que a reserva foi cancelada.
      row.status = 'cancelada';

      // Persiste a lista atualizada, mantendo os demais registros.
      await this.salvarArquivo('reservas', rows);

      // Reconstrói e retorna a reserva com o status atualizado.
      return this.fromJSON(row);
    });
  }

  // ---------------------------------------------------------------------
  // Verificação de conflitos de horário
  // ---------------------------------------------------------------------

  /**
   * Verifica se existe uma reserva confirmada que conflite
   * com o intervalo de horário solicitado para determinada sala.
   *
   * Dois intervalos se sobrepõem quando o início de um ocorre
   * antes do fim do outro e o fim ocorre depois do início.
   *
   * @param salaId Identificador da sala consultada.
   * @param data Data da reserva no formato YYYY-MM-DD.
   * @param inicio Horário inicial solicitado no formato HH:mm.
   * @param fim Horário final solicitado no formato HH:mm.
   * @returns true quando existe conflito; caso contrário, false.
   */
  async existeConflito(
    salaId: string,
    data: string,
    inicio: string,
    fim: string
  ): Promise<boolean> {
    // Consulta as reservas associadas à sala informada.
    return (await this.listarPorSala(salaId)).some(
      // Verifica se existe alguma reserva confirmada na mesma data e com horários sobrepostos.
      r =>
        r.status === 'confirmada' &&
        r.data === data &&
        r.horarioInicio < fim &&
        r.horarioFim > inicio
    );
  }

  // ---------------------------------------------------------------------
  // Busca de reserva em andamento
  // ---------------------------------------------------------------------

  /**
   * Busca uma reserva confirmada que esteja em andamento
   * na sala e no instante informados.
   *
   * A data e a hora são calculadas utilizando o fuso horário
   * de São Paulo, independentemente do fuso padrão do servidor.
   *
   * @param salaId Identificador da sala consultada.
   * @param agora Data e horário utilizados para verificar a reserva.
   * @returns A reserva ativa encontrada ou null caso não exista.
   */
  async buscarReservaAtiva(
    salaId: string,
    agora: Date
  ): Promise<Reserva | null> {

    // Formata a data e a hora no padrão YYYY-MM-DD HH:mm,
    // utilizando o fuso horário de São Paulo e o formato de 24 horas.
    const local = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).format(agora);

    // Extrai a data no formato YYYY-MM-DD a partir da string formatada.
    const data = local.slice(0, 10);

    // Extrai o horário no formato HH:mm a partir da string formatada.
    const hora = local.slice(11, 16);

    // Procura uma reserva confirmada para a sala e a data atuais,
    // cujo intervalo contenha o horário informado.
    return (await this.listarPorSala(salaId)).find(
      r =>
        r.status === 'confirmada' &&
        r.data === data &&
        r.horarioInicio <= hora &&
        r.horarioFim > hora
    ) || null; // Retorna null se nenhuma reserva estiver em andamento.
  }
}
