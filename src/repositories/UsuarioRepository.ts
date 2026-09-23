import path from 'path';
import { BaseRepository } from './BaseRepository';
import { Usuario } from '../models/Usuario';
import { Professor } from '../models/Professor';
import { Aluno } from '../models/Aluno';
import { Administrador } from '../models/Administrador';

/**
 * Repository responsável por ler/escrever src/data/usuarios.json.
 *
 * Como o arquivo mistura três subtipos de Usuario (Professor, Aluno e
 * Administrador), a reconstrução dos objetos verifica o campo `perfil`
 * e delega para o `fromJSON()` da classe correta.
 */
export class UsuarioRepository extends BaseRepository {
  private readonly caminhoArquivo: string;

  constructor() {
    super();
    this.caminhoArquivo = path.resolve(__dirname, '..', 'data', 'usuarios.json');
  }

  /**
   * Reconstrói a instância correta de Usuario com base no campo `perfil`.
   */
  private reconstruirUsuario(dadosBrutos: any): Usuario {
    switch (dadosBrutos?.perfil) {
      case 'professor':
        return Professor.fromJSON(dadosBrutos);
      case 'aluno':
        return Aluno.fromJSON(dadosBrutos);
      case 'administrador':
        return Administrador.fromJSON(dadosBrutos);
      default:
        throw new Error(
          `Perfil desconhecido "${dadosBrutos?.perfil}" no registro com id "${dadosBrutos?.id}".`
        );
    }
  }

  /**
   * Lista todos os usuários do arquivo, já reconstruídos como instâncias.
   */
  async listarTodos(): Promise<Usuario[]> {
    const dados = await this.lerArquivo(this.caminhoArquivo);
    return dados.map((registro) => this.reconstruirUsuario(registro));
  }

  /**
   * Busca um usuário pelo seu id. Retorna null se não encontrar.
   */
  async buscarPorId(id: string): Promise<Usuario | null> {
    const dados = await this.lerArquivo(this.caminhoArquivo);
    const encontrado = dados.find((registro) => registro.id === id);
    return encontrado ? this.reconstruirUsuario(encontrado) : null;
  }

  /**
   * Busca um usuário pelo e-mail. Comparação case-insensitive.
   * Utilizado no fluxo de login.
   */
  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const dados = await this.lerArquivo(this.caminhoArquivo);
    const alvo = email.trim().toLowerCase();
    const encontrado = dados.find(
      (registro) => String(registro.email ?? '').toLowerCase() === alvo
    );
    return encontrado ? this.reconstruirUsuario(encontrado) : null;
  }

  /**
   * Persiste um novo usuário. Garante que o id e o criadoEm existam
   * caso o Model não os tenha preenchido.
   */
  async criar(usuario: Usuario): Promise<Usuario> {
    const dados = await this.lerArquivo(this.caminhoArquivo);

    const bruto = usuario.toJSON();

    if (!bruto.id) {
      bruto.id = this.gerarId();
    }
    if (!bruto.criadoEm) {
      bruto.criadoEm = this.agora();
    }

    // Evita duplicidade de id no arquivo
    const jaExiste = dados.some((registro) => registro.id === bruto.id);
    if (jaExiste) {
      throw new Error(`Já existe um usuário com o id "${bruto.id}".`);
    }

    dados.push(bruto);
    await this.salvarArquivo(this.caminhoArquivo, dados);

    return this.reconstruirUsuario(bruto);
  }

  /**
   * Atualiza parcialmente um usuário pelo id.
   * Retorna o usuário atualizado ou null se não existir.
   */
  async atualizar(id: string, dadosParciais: Partial<any>): Promise<Usuario | null> {
    const dados = await this.lerArquivo(this.caminhoArquivo);
    const indice = dados.findIndex((registro) => registro.id === id);

    if (indice === -1) {
      return null;
    }

    // Não permitimos trocar o id nem o perfil através deste método
    const { id: _ignorarId, perfil: _ignorarPerfil, ...camposPermitidos } = dadosParciais;

    const atualizado = {
      ...dados[indice],
      ...camposPermitidos,
      id: dados[indice].id,
      perfil: dados[indice].perfil,
    };

    dados[indice] = atualizado;
    await this.salvarArquivo(this.caminhoArquivo, dados);

    return this.reconstruirUsuario(atualizado);
  }

  /**
   * Remove um usuário pelo id.
   * Retorna true se removeu, false se não encontrou.
   */
  async remover(id: string): Promise<boolean> {
    const dados = await this.lerArquivo(this.caminhoArquivo);
    const indice = dados.findIndex((registro) => registro.id === id);

    if (indice === -1) {
      return false;
    }

    dados.splice(indice, 1);
    await this.salvarArquivo(this.caminhoArquivo, dados);
    return true;
  }
}