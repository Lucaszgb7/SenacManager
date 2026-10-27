
import { BaseRepository } from "./BaseRepository";
import { Sala } from "../models/Sala";
import { RecordData } from "../services/store";

export class SalaRepository extends BaseRepository {
  private readonly colecao = "salas" as const;

  async listarTodas(): Promise<Sala[]> {
    const dados = await this.lerArquivo(this.colecao);
    return dados.map((registro) => Sala.fromJSON(registro));
  }

  async buscarPorId(id: string): Promise<Sala | null> {
    const dados = await this.lerArquivo(this.colecao);
    const registro = dados.find((item) => String(item.id) === id);

    return registro ? Sala.fromJSON(registro) : null;
  }

  async criar(sala: Sala): Promise<Sala> {
    return this.transacao(async () => {
      const dados = await this.lerArquivo(this.colecao);
      const registro = sala.toJSON();

      if (dados.some((item) => String(item.id) === String(registro.id))) {
        throw new Error(`Já existe uma sala com o id "${registro.id}".`);
      }

      dados.push(registro as RecordData);
      await this.salvarArquivo(this.colecao, dados);

      return Sala.fromJSON(registro);
    });
  }

  async atualizar(
    id: string,
    salaAtualizada: Sala
  ): Promise<Sala | null> {
    return this.transacao(async () => {
      const dados = await this.lerArquivo(this.colecao);
      const indice = dados.findIndex((item) => String(item.id) === id);

      if (indice === -1) {
        return null;
      }

      const registro = {
        ...salaAtualizada.toJSON(),
        id,
      };

      dados[indice] = registro as RecordData;
      await this.salvarArquivo(this.colecao, dados);

      return Sala.fromJSON(registro);
    });
  }

  async remover(id: string): Promise<boolean> {
    return this.transacao(async () => {
      const dados = await this.lerArquivo(this.colecao);
      const indice = dados.findIndex((item) => String(item.id) === id);

      if (indice === -1) {
        return false;
      }

      dados.splice(indice, 1);
      await this.salvarArquivo(this.colecao, dados);

      return true;
    });
  }
}
