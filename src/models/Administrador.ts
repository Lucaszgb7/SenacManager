import { Usuario } from './Usuario';

/**
 * Representa um administrador do SenacManager.
 * Herda os dados e comportamentos comuns da classe Usuario.
 * O perfil é definido como 'administrador' e não pode ser alterado.
 */
export class Administrador extends Usuario {
  constructor(
    nome: string,
    email: string,
    senhaHash: string,
    id?: string,
    criadoEm?: Date
  ) {
    // Define o perfil fixo do administrador.
    super(nome, email, senhaHash, 'administrador', id, criadoEm);
  }

  // ---------------------------------------------------------------------
  // Serialização
  // ---------------------------------------------------------------------

  /**
   * Converte o administrador em um objeto simples,
   * preservando os campos definidos na classe Usuario.
   */
  public toJSON(): Record<string, unknown> {
    return super.toJSON();
  }

  /**
   * Reconstrói um administrador a partir de um objeto JSON.
   * Valida o perfil recebido e restaura os dados do usuário.
   */
  public static fromJSON(data: any): Administrador {
    // Verifica se os dados recebidos são válidos.
    if (!data || typeof data !== 'object') {
      throw new Error('Dados inválidos para reconstruir Administrador.');
    }

    // Impede que dados de outro perfil sejam usados como administrador.
    if (
      data.perfil !== 'administrador' &&
      data.perfil !== 'admin'
    ) {
      throw new Error('O perfil informado não corresponde a Administrador.');
    }

    // Reconstrói a instância usando o construtor da classe.
    const administrador = new Administrador(
      data.nome,
      data.email,
      data.senhaHash,
      data.id,
      data.criadoEm ? new Date(data.criadoEm) : undefined
    );

    // Restaura os campos complementares do usuário.
    administrador.telefone = data.telefone ?? null;
    administrador.fotoUrl = data.fotoUrl ?? null;
    administrador.ativo = data.ativo !== false;

    return administrador;
  }
}