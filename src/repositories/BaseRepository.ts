import { randomUUID } from 'crypto';
import { readData, writeData, transaction, RecordData, Collection } from '../services/store';
export abstract class BaseRepository {
  protected lerArquivo(caminho: Collection): Promise<RecordData[]> { return readData(caminho); }
  protected salvarArquivo(caminho: Collection, dados: RecordData[]): Promise<void> { return writeData(caminho, dados); }
  protected transacao<T>(operation: () => Promise<T>): Promise<T> { return transaction(operation); }
  protected gerarId(): string { return randomUUID(); }
  protected agora(): string { return new Date().toISOString(); }
}
