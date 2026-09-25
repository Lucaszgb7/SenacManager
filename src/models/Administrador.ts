import { Usuario } from './Usuario';

/**
 * Representa um administrador do SenacManager.
 * Não possui propriedades extras — apenas força o perfil 'administrador'.
 */
export class Administrador extends Usuario {
  constructor(
    nome: string,
    email: string,
    senhaHash: string,
    id?: string,
    criadoEm?: Date
  ) {
    // Perfil fixo: 'administrador'
    super(nome, email, senhaHash, 'administrador', id, criadoEm);
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
    };
  }

  /**
   * Reconstrói um Administrador a partir de um objeto plano.
   */
  static fromJSON(data: any): Administrador {
    const usuario = new Administrador(
      data.nome,
      data.email,
      data.senhaHash,
      data.id,
      data.criadoEm ? new Date(data.criadoEm) : undefined
    );
    usuario.telefone = data.telefone ?? null;
    usuario.fotoUrl = data.fotoUrl ?? null;
    usuario.ativo = data.ativo !== false;
    return usuario;
  }
}