import { resolve } from 'path';
import { Sala } from '../models/Sala';
import { BaseRepository } from './BaseRepository';
import { ReservaRepository } from './ReservaRepository';

export class SalaRepository extends BaseRepository {
  private readonly caminhoArquivo = resolve(__dirname, '../../src/data', 'salas.json');

  constructor(private readonly reservaRepository = new ReservaRepository()) {
    super();
  }

  protected fromJSON(dados: any): Sala {
    return Sala.fromJSON(dados);
  }

  async listarTodas(): Promise<Sala[]> {
    return (await this.lerArquivo(this.caminhoArquivo)).map((dados) => this.fromJSON(dados));
  }

  async buscarPorId(id: string): Promise<Sala | null> {
    return (await this.listarTodas()).find((sala) => sala.id === id) ?? null;
  }

  async criar(sala: Sala): Promise<Sala> {
    const salas = await this.listarTodas();
    salas.push(sala);
    await this.salvarArquivo(this.caminhoArquivo, salas.map((item) => item.toJSON()));
    return sala;
  }

  async atualizar(id: string, dados: Partial<any>): Promise<Sala | null> {
    const salas = await this.listarTodas();
    const indice = salas.findIndex((sala) => sala.id === id);
    const atual = salas[indice];
    if (!atual) return null;
    const sala = Sala.fromJSON({ ...atual.toJSON(), ...dados, id });
    salas[indice] = sala;
    await this.salvarArquivo(this.caminhoArquivo, salas.map((item) => item.toJSON()));
    return sala;
  }

  async remover(id: string): Promise<boolean> {
    const salas = await this.listarTodas();
    const restantes = salas.filter((sala) => sala.id !== id);
    if (restantes.length === salas.length) return false;
    await this.salvarArquivo(this.caminhoArquivo, restantes.map((item) => item.toJSON()));
    return true;
  }

  async listarDisponiveis(data: string, horarioInicio: string, horarioFim: string): Promise<Sala[]> {
    const salas = await this.listarTodas();
    const conflitos = await Promise.all(salas.map((sala) =>
      this.reservaRepository.existeConflito(sala.id, data, horarioInicio, horarioFim)
    ));
    return salas.filter((_, indice) => !conflitos[indice]);
  }
}
