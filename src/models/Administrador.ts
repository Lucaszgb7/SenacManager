
import { Usuario } from './Usuario';

/**
 * Representa um administrador do SenacManager.
 * Herda da classe Usuario os dados e comportamentos comuns,
 * como nome, e-mail, hash da senha, identificador e data de criação.
 *
 * O perfil do administrador é definido no construtor e não pode
 * ser alterado depois da criação da instância.
 */
export class Administrador extends Usuario {
  /**
   * Cria uma nova instância de administrador.
   *
   * @param nome Nome completo do administrador.
   * @param email Endereço de e-mail utilizado pelo administrador.
   * @param senhaHash Hash da senha, nunca a senha em texto puro.
   * @param id Identificador único opcional do administrador.
   * @param criadoEm Data de criação opcional da conta.
   */
  constructor(
    nome: string,
    email: string,
    senhaHash: string,
    id?: string,
    criadoEm?: Date
  ) {
    // Define o perfil como administrador e encaminha os dados
    // comuns para o construtor da classe base Usuario.
    super(nome, email, senhaHash, 'administrador', id, criadoEm);
  }

  // ---------------------------------------------------------------------
  // Serialização
  // ---------------------------------------------------------------------

  /**
   * Converte a instância de Administrador em um objeto simples.
   * Reutiliza a serialização da classe Usuario para manter
   * os campos comuns padronizados.
   *
   * @returns Objeto contendo os dados serializados do administrador.
   */
  public toJSON(): Record<string, unknown> {
    // Aproveita o método da classe base para evitar duplicação de código.
    return super.toJSON();
  }

  /**
   * Reconstrói uma instância de Administrador a partir de um objeto.
   * Valida os dados recebidos, verifica o perfil e restaura
   * as informações básicas e complementares do usuário.
   *
   * @param data Objeto contendo os dados previamente serializados.
   * @returns Instância de Administrador reconstruída.
   * @throws Error Caso os dados sejam inválidos ou o perfil seja incompatível.
   */
  public static fromJSON(data: any): Administrador {
    // Garante que os dados recebidos existam e sejam um objeto válido.
    if (!data || typeof data !== 'object') {
      throw new Error('Dados inválidos para reconstruir Administrador.');
    }

    // Aceita os dois identificadores de perfil para manter
    // compatibilidade com dados existentes no sistema.
    if (
      data.perfil !== undefined &&
      data.perfil !== 'administrador' &&
      data.perfil !== 'admin'
    ) {
      throw new Error('O perfil informado não corresponde a Administrador.');
    }

    // Cria a instância utilizando os dados básicos recebidos.
    // A data de criação é convertida novamente para um objeto Date.
    const administrador = new Administrador(
      data.nome,
      data.email,
      data.senhaHash,
      data.id,
      data.criadoEm ? new Date(data.criadoEm) : undefined
    );

    // Restaura o telefone, utilizando null caso não exista um valor.
    administrador.telefone = data.telefone ?? null;

    // Restaura a URL da foto de perfil ou utiliza null como padrão.
    administrador.fotoUrl = data.fotoUrl ?? null;

    // Mantém a conta ativa por padrão; desativa somente se o valor
    // recebido for explicitamente false.
    administrador.ativo = data.ativo !== false;

    // Retorna a instância reconstruída com seus dados restaurados.
    return administrador;
  }
}
