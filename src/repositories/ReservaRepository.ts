
import path from 'path';
import { BaseRepository } from './BaseRepository';
import { Reserva } from '../models/Reserva';

export class ReservaRepository extends BaseRepository {
  private readonly caminhoArquivo: string;

  constructor() {
    super();
    this.caminhoArquivo = path.resolve(__dirname, '..', 'data', 'reservas.json');
  }

  async listarTodas(): Promise<Reserva[]> {
    const dados = await this.lerArquivo(this.caminhoArquivo);
    return dados.map((registro) => Reserva.fromJSON(registro));
  }

  async listarPorProfessor(professorId: string): Promise<Reserva[]> {
    const reservas = await this.listarTodas();

    return reservas.filter(
      (reserva) => reserva.professorId === professorId
    );
  }

  async buscarPorId(id: string): Promise<Reserva | null> {
    const dados = await this.lerArquivo(this.caminhoArquivo);
    const registro = dados.find((item) => item.id === id);

    return registro ? Reserva.fromJSON(registro) : null;
  }

  async criar(reserva: Reserva): Promise<Reserva> {
    const dados = await this.lerArquivo(this.caminhoArquivo);
    const registro = reserva.toJSON();

    if (dados.some((item) => item.id === registro.id)) {
      throw new Error(`Já existe uma reserva com o id "${registro.id}".`);
    }

    dados.push(registro);
    await this.salvarArquivo(this.caminhoArquivo, dados);

    return Reserva.fromJSON(registro);
  }

  async atualizar(id: string, reservaAtualizada: Reserva): Promise<Reserva | null> {
    const dados = await this.lerArquivo(this.caminhoArquivo);
    const indice = dados.findIndex((item) => item.id === id);

    if (indice === -1) {
      return null;
    }

    const registro = {
      ...reservaAtualizada.toJSON(),
      id,
    };

    dados[indice] = registro;
    await this.salvarArquivo(this.caminhoArquivo, dados);

    return Reserva.fromJSON(registro);
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
