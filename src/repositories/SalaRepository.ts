
import { BaseRepository } from "./BaseRepository"; // Importa a classe base que fornece operações de leitura, escrita e transação.
import { Sala } from "../models/Sala"; // Importa o modelo Sala, responsável pelos dados e pelas validações de uma sala.
import { RecordData } from "../services/store"; // Importa o tipo utilizado para representar os registros armazenados.

// ---------------------------------------------------------------------
// Repositório de salas
// ---------------------------------------------------------------------

/**
 * Gerencia as operações de acesso e persistência das salas do SenacManager.
 *
 * Permite listar, buscar, criar, atualizar e remover salas
 * armazenadas na coleção correspondente.
 *
 * Utiliza a classe BaseRepository para acessar os dados e executar
 * operações transacionais que preservam a consistência das alterações.
 */
export class SalaRepository extends BaseRepository {

  // ---------------------------------------------------------------------
  // Configuração da coleção
  // ---------------------------------------------------------------------

  // Define o nome da coleção utilizada para armazenar os registros de salas.
  // O uso de "as const" mantém o valor tipado como o literal "salas".
  private readonly colecao = "salas" as const;

  // ---------------------------------------------------------------------
  // Consulta de salas
  // ---------------------------------------------------------------------

  /**
   * Lista todas as salas cadastradas no sistema.
   *
   * @returns Lista de salas reconstruídas como instâncias do modelo Sala.
   */
  async listarTodas(): Promise<Sala[]> {
    // Lê os registros armazenados na coleção de salas.
    const dados = await this.lerArquivo(this.colecao);

    // Converte cada registro simples em uma instância da classe Sala.
    return dados.map((registro) => Sala.fromJSON(registro));
  }

  /**
   * Busca uma sala pelo seu identificador único.
   *
   * @param id Identificador da sala que será consultada.
   * @returns A sala encontrada ou null caso não exista.
   */
  async buscarPorId(id: string): Promise<Sala | null> {
    // Lê todos os registros armazenados na coleção de salas.
    const dados = await this.lerArquivo(this.colecao);

    // Localiza o registro cujo identificador corresponde ao valor informado.
    // String() padroniza a comparação caso o ID esteja armazenado em outro tipo.
    const registro = dados.find((item) => String(item.id) === id);

    // Reconstrói a sala encontrada; se não houver correspondência, retorna null.
    return registro ? Sala.fromJSON(registro) : null;
  }

  // ---------------------------------------------------------------------
  // Criação de salas
  // ---------------------------------------------------------------------

  /**
   * Cadastra uma nova sala na coleção.
   *
   * A operação utiliza uma transação para agrupar a leitura,
   * a verificação de duplicidade e a gravação dos dados.
   *
   * @param sala Instância da sala que será cadastrada.
   * @returns A sala reconstruída após a persistência.
   * @throws Error Caso já exista uma sala com o mesmo identificador.
   */
  async criar(sala: Sala): Promise<Sala> {
    // Executa o cadastro dentro do mecanismo de transação do repositório.
    return this.transacao(async () => {

      // Recupera os registros atuais antes de adicionar uma nova sala.
      const dados = await this.lerArquivo(this.colecao);

      // Converte a instância da sala em um objeto simples para persistência.
      const registro = sala.toJSON();

      // Verifica se já existe um registro com o mesmo identificador.
      if (dados.some((item) => String(item.id) === String(registro.id))) {
        // Interrompe a operação para impedir o cadastro de um ID duplicado.
        throw new Error(`Já existe uma sala com o id "${registro.id}".`);
      }

      // Adiciona o novo registro à lista de salas.
      // A conversão de tipo informa ao TypeScript que o objeto segue RecordData.
      dados.push(registro as RecordData);

      // Persiste a lista atualizada na coleção de salas.
      await this.salvarArquivo(this.colecao, dados);

      // Reconstrói e retorna a sala a partir dos dados serializados.
      return Sala.fromJSON(registro);
    });
  }

  // ---------------------------------------------------------------------
  // Atualização de salas
  // ---------------------------------------------------------------------

  /**
   * Atualiza os dados de uma sala existente.
   *
   * O identificador recebido é preservado no registro atualizado,
   * mesmo que a instância fornecida contenha outro ID.
   *
   * @param id Identificador da sala que será atualizada.
   * @param salaAtualizada Instância contendo os novos dados da sala.
   * @returns A sala atualizada ou null caso o registro não exista.
   */
  async atualizar(
    id: string,
    salaAtualizada: Sala
  ): Promise<Sala | null> {
    // Executa a atualização dentro de uma transação.
    return this.transacao(async () => {

      // Lê os registros atuais da coleção.
      const dados = await this.lerArquivo(this.colecao);

      // Procura a posição do registro que possui o identificador informado.
      const indice = dados.findIndex((item) => String(item.id) === id);

      // Retorna null se nenhuma sala corresponder ao identificador.
      if (indice === -1) {
        return null;
      }

      // Gera o objeto atualizado a partir dos dados da sala recebida.
      // O ID informado no método prevalece sobre o ID da instância.
      const registro = {
        ...salaAtualizada.toJSON(),
        id,
      };

      // Substitui o registro antigo pelos novos dados na posição encontrada.
      // A conversão de tipo adequa o objeto ao formato RecordData.
      dados[indice] = registro as RecordData;

      // Salva a coleção com a sala atualizada.
      await this.salvarArquivo(this.colecao, dados);

      // Retorna uma nova instância de Sala com os dados persistidos.
      return Sala.fromJSON(registro);
    });
  }

  // ---------------------------------------------------------------------
  // Remoção de salas
  // ---------------------------------------------------------------------

  /**
   * Remove uma sala da coleção pelo seu identificador.
   *
   * A operação exclui o registro da coleção, em vez de apenas
   * marcar a sala como inativa.
   *
   * @param id Identificador da sala que será removida.
   * @returns true se a sala foi removida ou false se não foi encontrada.
   */
  async remover(id: string): Promise<boolean> {
    // Executa a remoção dentro do mecanismo de transação.
    return this.transacao(async () => {

      // Recupera todos os registros atuais da coleção de salas.
      const dados = await this.lerArquivo(this.colecao);

      // Localiza o índice do registro que corresponde ao ID informado.
      const indice = dados.findIndex((item) => String(item.id) === id);

      // Retorna false caso a sala não exista na coleção.
      if (indice === -1) {
        return false;
      }

      // Remove um elemento da lista na posição encontrada.
      dados.splice(indice, 1);

      // Persiste a lista sem o registro removido.
      await this.salvarArquivo(this.colecao, dados);

      // Informa que a sala foi encontrada e removida com sucesso.
      return true;
    });
  }
}
