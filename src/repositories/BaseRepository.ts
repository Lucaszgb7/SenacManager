import { randomUUID } from 'crypto';
import { readData, writeData, transaction, RecordData, Collection } from '../services/store';
export abstract class BaseRepository {
  protected lerArquivo(caminho: Collection): Promise<RecordData[]> { return readData(caminho); }
  protected salvarArquivo(caminho: Collection, dados: RecordData[]): Promise<void> { return writeData(caminho, dados); }
  protected transacao<T>(operation: () => Promise<T>): Promise<T> { return transaction(operation); }
  protected gerarId(): string { return randomUUID(); }
  protected agora(): string { return new Date().toISOString(); }
}
// Importa a função responsável por gerar identificadores únicos. import { randomUUID } from 'crypto';

// Importa as funções e os tipos utilizados para acessar e manipular os dados armazenados. import { readData, writeData, transaction, RecordData, Collection } from '../services/store';

// Define uma classe base abstrata com métodos reutilizáveis pelos repositórios do sistema. export abstract class BaseRepository {

// Lê os registros de uma coleção e retorna uma lista de dados. // O caminho deve corresponder a uma coleção válida do tipo Collection. protected lerArquivo(caminho: Collection): Promise<RecordData[]> { return readData(caminho); }

// Salva uma lista de registros na coleção especificada. // Retorna uma Promise que é concluída quando a gravação termina. protected salvarArquivo(caminho: Collection, dados: RecordData[]): Promise<void> { return writeData(caminho, dados); }

// Executa uma operação dentro de uma transação. // O tipo genérico T permite retornar diferentes tipos de resultado. protected transacao<T>(operation: () => Promise<T>): Promise<T> { return transaction(operation); }

// Gera e retorna um identificador único no formato UUID. protected gerarId(): string { return randomUUID(); }

// Retorna a data e a hora atuais no formato ISO 8601. // Esse formato facilita o armazenamento e a padronização das datas. protected agora(): string { return new Date().toISOString(); } }