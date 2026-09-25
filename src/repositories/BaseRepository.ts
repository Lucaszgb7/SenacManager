import { randomUUID } from 'crypto';
import { readFileRecords, writeFileRecords, transaction, RecordData } from '../services/store';
export abstract class BaseRepository {
  protected lerArquivo(caminho: string): Promise<RecordData[]> { return readFileRecords(caminho); }
  protected salvarArquivo(caminho: string, dados: RecordData[]): Promise<void> { return writeFileRecords(caminho, dados); }
  protected transacao<T>(operation: () => Promise<T>): Promise<T> { return transaction(operation); }
  protected gerarId(): string { return randomUUID(); }
  protected agora(): string { return new Date().toISOString(); }
}
