
import { Usuario } from './Usuario';

/**
 * Representa um professor do SenacManager.
 * Possui uma lista de disciplinas que leciona.
 */
export class Professor extends Usuario {
  // Armazena as disciplinas associadas ao professor.
  private _disciplinas: string[];

  constructor(
    nome: string,
    email: string,
    senhaHash: string,
    disciplinas: string[] = [],
    id?: string,
    criadoEm?: Date
  ) {
    // Define o perfil fixo do professor.
    super(nome, email, senhaHash, 'professor', id, criadoEm);

    // Inicializa a lista e utiliza o setter para validar os dados.
    this._disciplinas = [];
    this.disciplinas = disciplinas;
  }

  // ---------------------------------------------------------------------
  // Getter e setter de disciplinas
  // ---------------------------------------------------------------------

  /**
   * Retorna uma cópia da lista de disciplinas.
   * Evita que alterações externas modifiquem a lista diretamente.
   */
  public get disciplinas(): string[] {
    return [...this._disciplinas];
  }

  /**
   * Define as disciplinas do professor.
   * Valida os valores, remove espaços desnecessários
   * e evita duplicatas sem diferenciar maiúsculas de minúsculas.
   */
  public set disciplinas(valor: string[]) {
    if (!Array.isArray(valor)) {
      throw new Error('Disciplinas deve ser um array de strings.');
    }

    const normalizadas: string[] = [];
    const vistas = new Set<string>();

    for (const disciplina of valor) {
      // Garante que cada disciplina seja uma string válida.
      if (
        typeof disciplina !== 'string' ||
        disciplina.trim().length < 2
      ) {
        throw new Error(
          'Cada disciplina deve ter pelo menos 2 caracteres.'
        );
      }

      // Remove espaços no início e no final do nome.
      const limpa = disciplina.trim();
      const chave = limpa.toLowerCase();

      // Adiciona somente disciplinas que ainda não existem na lista.
      if (!vistas.has(chave)) {
        vistas.add(chave);
        normalizadas.push(limpa);
      }
    }

    this._disciplinas = normalizadas;
  }

  // ---------------------------------------------------------------------
  // Serialização
  // ---------------------------------------------------------------------

  /**
   * Converte o professor em um objeto simples,
   * incluindo os dados herdados e suas disciplinas.
   */
  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      disciplinas: [...this._disciplinas],
    };
  }

  /**
   * Reconstrói um professor a partir de um objeto JSON.
   * Restaura os dados básicos, as disciplinas e os campos complementares.
   */
  public static fromJSON(data: any): Professor {
    if (!data || typeof data !== 'object') {
      throw new Error('Dados inválidos para reconstruir Professor.');
    }

    // Confere se o perfil corresponde à classe Professor.
    if (data.perfil !== 'professor') {
      throw new Error('O perfil informado não corresponde a Professor.');
    }

    // Reconstrói o professor e valida a lista de disciplinas.
    const professor = new Professor(
      data.nome,
      data.email,
      data.senhaHash,
      data.disciplinas ?? [],
      data.id,
      data.criadoEm ? new Date(data.criadoEm) : undefined
    );

    // Restaura os campos complementares do usuário.
    professor.telefone = data.telefone ?? null;
    professor.fotoUrl = data.fotoUrl ?? null;
    professor.ativo = data.ativo !== false;

    return professor;
  }
}
