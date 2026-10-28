
import { Usuario } from '../models/Usuario'; // Importa a classe base que representa os usuários do sistema.
import { Professor } from '../models/Professor'; // Importa o modelo específico de professor.
import { Aluno } from '../models/Aluno'; // Importa o modelo específico de aluno.
import { Administrador } from '../models/Administrador'; // Importa o modelo específico de administrador.
import { BaseRepository } from './BaseRepository'; // Importa a classe base com os métodos de persistência e transação.

// ---------------------------------------------------------------------
// Repositório de usuários
// ---------------------------------------------------------------------

/**
 * Gerencia as operações de consulta, criação, atualização e remoção
 * dos usuários cadastrados no SenacManager.
 *
 * Centraliza o acesso à coleção de usuários e utiliza o perfil
 * armazenado nos dados para reconstruir a classe correspondente.
 *
 * Como existem diferentes tipos de usuários, o repositório trabalha
 * com a classe base Usuario e utiliza suas subclasses quando necessário.
 */
export class UsuarioRepository extends BaseRepository {

  // ---------------------------------------------------------------------
  // Construtor
  // ---------------------------------------------------------------------

  /**
   * Inicializa o repositório de usuários.
   * Chama o construtor da classe base para manter a estrutura herdada.
   */
  constructor() {
    // Executa a inicialização definida em BaseRepository.
    super();
  }

  // ---------------------------------------------------------------------
  // Conversão de dados
  // ---------------------------------------------------------------------

  /**
   * Reconstrói a instância correta de usuário de acordo com o perfil
   * registrado no objeto recebido.
   *
   * Essa centralização evita repetir a seleção do modelo nos métodos
   * que precisam converter registros armazenados em objetos do domínio.
   *
   * @param dados Objeto contendo os dados serializados do usuário.
   * @returns Instância de Professor, Aluno ou Administrador.
   * @throws Error Caso o perfil informado não seja reconhecido.
   */
  protected fromJSON(dados: any): Usuario {
    // Verifica o perfil armazenado para determinar qual classe utilizar.
    switch (dados.perfil) {

      // Reconstrói um professor quando o perfil corresponde a professor.
      case "professor":
        return Professor.fromJSON(dados);

      // Reconstrói um aluno quando o perfil corresponde a aluno.
      case "aluno":
        return Aluno.fromJSON(dados);

      // Aceita o perfil administrador utilizado pelo sistema.
      case "administrador":

      // Mantém compatibilidade com registros antigos que utilizam admin.
      case "admin":
        return Administrador.fromJSON(dados);

      // Interrompe a operação se o perfil não corresponder a nenhum caso conhecido.
      default:
        throw new Error(`Perfil desconhecido em usuarios.json: ${dados.perfil}`);
    }
  }

  // ---------------------------------------------------------------------
  // Consulta de usuários
  // ---------------------------------------------------------------------

  /**
   * Lista todos os usuários cadastrados.
   *
   * Cada registro armazenado é convertido em uma instância
   * da classe correspondente ao seu perfil.
   *
   * @returns Lista de usuários cadastrados no sistema.
   */
  async listarTodos(): Promise<Usuario[]> {
    // Lê todos os registros da coleção de usuários.
    const dados = await this.lerArquivo('usuarios');

    // Converte cada registro em sua respectiva instância do modelo.
    return dados.map((item: any) => this.fromJSON(item));
  }

  /**
   * Busca um usuário pelo endereço de e-mail.
   *
   * A comparação ignora diferenças entre letras maiúsculas
   * e minúsculas e remove espaços externos do e-mail informado.
   *
   * @param email Endereço de e-mail utilizado na busca.
   * @returns O usuário encontrado ou null caso não exista.
   */
  async buscarPorEmail(email: string): Promise<Usuario | null> {
    // Recupera a lista de usuários cadastrados.
    const usuarios = await this.listarTodos();

    // Normaliza o e-mail informado para padronizar a comparação.
    const alvo = email.toLowerCase().trim();

    // Procura o usuário cujo e-mail corresponde ao valor normalizado.
    const encontrado = usuarios.find(
      (u) => u.email.toLowerCase() === alvo
    );

    // Retorna o usuário encontrado ou null quando não houver correspondência.
    return encontrado ?? null;
  }

  /**
   * Busca um usuário pelo identificador único.
   *
   * @param id Identificador do usuário que será consultado.
   * @returns O usuário encontrado ou null caso não exista.
   */
  async buscarPorId(id: string): Promise<Usuario | null> {
    // Recupera todos os usuários cadastrados.
    const usuarios = await this.listarTodos();

    // Localiza o usuário que possui o identificador informado.
    const encontrado = usuarios.find((u) => u.id === id);

    // Retorna o resultado da busca ou null se nenhum usuário for encontrado.
    return encontrado ?? null;
  }

  // ---------------------------------------------------------------------
  // Criação de usuários
  // ---------------------------------------------------------------------

  /**
   * Cadastra um novo usuário.
   *
   * Antes de salvar, verifica se já existe um registro com o mesmo
   * identificador ou endereço de e-mail.
   *
   * @param usuario Instância do usuário que será cadastrada.
   * @returns O próprio usuário após a persistência.
   * @throws Error Caso o identificador ou o e-mail já estejam cadastrados.
   */
  async criar(usuario: Usuario): Promise<Usuario> {
    // Executa a criação dentro de uma transação.
    return this.transacao(async () => {

      // Lê os registros atuais da coleção de usuários.
      const rows = await this.lerArquivo('usuarios');

      // Verifica se existe um usuário com o mesmo ID ou e-mail.
      if (rows.some(
        u =>
          u.id === usuario.id ||
          u.email.trim().toLowerCase() === usuario.email
      )) {
        // Impede a criação de registros duplicados.
        throw new Error('Usuário já cadastrado.');
      }

      // Adiciona o usuário serializado à lista de registros existentes.
      await this.salvarArquivo('usuarios', [...rows, usuario.toJSON()]);

      // Retorna a instância do usuário que acabou de ser cadastrada.
      return usuario;
    });
  }

  // ---------------------------------------------------------------------
  // Atualização de usuários
  // ---------------------------------------------------------------------

  /**
   * Atualiza os dados de um usuário existente.
   *
   * Combina os dados atuais com as alterações recebidas, preservando
   * o identificador e o perfil original do usuário.
   *
   * @param id Identificador do usuário que será atualizado.
   * @param dados Campos que serão adicionados ou modificados.
   * @returns O usuário atualizado ou null caso não exista.
   * @throws Error Caso o novo e-mail já pertença a outro usuário.
   */
  async atualizar(
    id: string,
    dados: Partial<Record<string, unknown>>
  ): Promise<Usuario | null> {
    // Executa a atualização dentro de uma transação.
    return this.transacao(async () => {

      // Lê todos os registros atuais da coleção.
      const rows = await this.lerArquivo('usuarios');

      // Localiza o registro do usuário que será atualizado.
      const existing = rows.find(u => u.id === id);

      // Encerra a operação se o usuário não existir.
      if (!existing) {
        return null;
      }

      // Combina os dados existentes com as alterações recebidas.
      // O ID e o perfil original são preservados para evitar sua substituição.
      const merged = { ...existing, ...dados, id, perfil: existing.perfil };

      // Reconstrói o usuário para aplicar as validações do modelo correspondente.
      const usuario = this.fromJSON(merged);

      // Verifica se outro usuário já utiliza o e-mail atualizado.
      if (rows.some(
        u =>
          u.id !== id &&
          u.email.trim().toLowerCase() === usuario.email
      )) {
        // Impede que dois usuários diferentes tenham o mesmo e-mail.
        throw new Error('E-mail já cadastrado.');
      }

      // Substitui o registro atualizado e mantém os demais usuários.
      // A serialização preserva também os campos definidos no modelo específico.
      await this.salvarArquivo(
        'usuarios',
        rows.map(
          u =>
            u.id === id
              ? { ...merged, ...usuario.toJSON() }
              : u
        )
      );

      // Retorna a instância atualizada após a validação dos dados.
      return usuario;
    });
  }

  // ---------------------------------------------------------------------
  // Remoção de usuários
  // ---------------------------------------------------------------------

  /**
   * Remove um usuário da coleção pelo identificador.
   *
   * @param id Identificador do usuário que será removido.
   * @returns true se o usuário foi removido ou false se não foi encontrado.
   */
  async remover(id: string): Promise<boolean> {
    // Executa a remoção dentro de uma transação.
    return this.transacao(async () => {

      // Lê os registros atuais da coleção de usuários.
      const rows = await this.lerArquivo('usuarios');

      // Verifica se existe algum usuário com o identificador informado.
      if (!rows.some(u => u.id === id)) {
        // Retorna false sem modificar os dados quando o usuário não existe.
        return false;
      }

      // Cria uma lista contendo somente os usuários com IDs diferentes do informado.
      const usuariosRestantes = rows.filter(u => u.id !== id);

      // Persiste a lista sem o usuário removido.
      await this.salvarArquivo('usuarios', usuariosRestantes);

      // Informa que o usuário foi encontrado e removido com sucesso.
      return true;
    });
  }
}
