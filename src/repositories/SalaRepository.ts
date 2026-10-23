
import path from 'path';
import { BaseRepository } from './BaseRepository';
import { Sala } from '../models/Sala';

export class SalaRepository extends BaseRepository {
  private readonly caminhoArquivo: string;

  constructor() {
    super();
    this.caminhoArquivo = path.resolve(__dirname, '..', 'data', 'salas.json');
  }

  async listarTodas(): Promise<Sala[]> {
    const dados = await this.lerArquivo(this.caminhoArquivo);
    return dados.map((registro) => Sala.fromJSON(registro));
  }

  async buscarPorId(id: string): Promise<Sala | null> {
    const dados = await this.lerArquivo(this.caminhoArquivo);
    const registro = dados.find((item) => item.id === id);

    return registro ? Sala.fromJSON(registro) : null;
  }

  async criar(sala: Sala): Promise<Sala> {
    const dados = await this.lerArquivo(this.caminhoArquivo);
    const registro = sala.toJSON();

    if (dados.some((item) => item.id === registro.id)) {
      throw new Error(`Já existe uma sala com o id "${registro.id}".`);
    }

    dados.push(registro);
    await this.salvarArquivo(this.caminhoArquivo, dados);

    return Sala.fromJSON(registro);
  }

  async atualizar(id: string, salaAtualizada: Sala): Promise<Sala | null> {
    const dados = await this.lerArquivo(this.caminhoArquivo);
    const indice = dados.findIndex((item) => item.id === id);

    if (indice === -1) {
      return null;
    }

    const registro = {
      ...salaAtualizada.toJSON(),
      id,
    };

    dados[indice] = registro;
    await this.salvarArquivo(this.caminhoArquivo, dados);

    return Sala.fromJSON(registro);
  }

  async remover(id: string): Promise<boolean> {
    const dados = await this.lerArquivo(this.caminhoArquivo);
    const indice = dados.findIndex((item) => item.id === id);

    if (indice === -1) {
      return false;
    }

    dados.splice(indice, 1);
    await this.salvarArquivo(this.caminhoArquivo, dados);

    return true;
  }
}
