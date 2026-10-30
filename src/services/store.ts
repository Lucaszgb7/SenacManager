import * as json from '../database/jsonStore';
import * as mysql from '../database/mysqlStore';
import { Collection, RecordData } from '../database/types';
export type { Collection, RecordData } from '../database/types';
export { dataPath, readFileRecords, writeFileRecords } from '../database/jsonStore';

export class DatabaseError extends Error {
  readonly code?: string | undefined;
  readonly status = 503;

  constructor(message = 'Banco de dados indisponível. Verifique a conexão com o servidor MySQL.', code?: string) {
    super(message);
    this.name = 'DatabaseError';
    if (code !== undefined) {
      this.code = code;
    }
  }
}

function driver() {
  const name = process.env.DB_DRIVER || 'json';
  if (name === 'json') return json;
  if (name === 'mysql') return mysql;
  throw new Error('DB_DRIVER inválido. Use json ou mysql.');
}

function handleDatabaseError(err: any): never {
  const isConnectionError =
    err?.code === 'ECONNREFUSED' ||
    err?.code === 'ENOTFOUND' ||
    err?.code === 'ETIMEDOUT' ||
    err?.code === 'ER_ACCESS_DENIED_ERROR' ||
    err?.code === 'PROTOCOL_CONNECTION_LOST' ||
    Boolean(err?.message?.includes('Configuração MySQL incompleta')) ||
    Boolean(err?.message?.includes('MySQL indisponível'));

  if (isConnectionError) {
    throw new DatabaseError(
      'Banco de dados indisponível. Verifique a conexão com o servidor MySQL.',
      err?.code || 'ECONNREFUSED'
    );
  }
  throw err;
}

export const readData = (name: Collection): Promise<RecordData[]> => {
  const d = driver();
  return d.readData(name).catch((err: any) => {
    if (process.env.DB_DRIVER === 'mysql') {
      handleDatabaseError(err);
    }
    throw err;
  });
};

export const writeData = (name: Collection, rows: RecordData[]): Promise<void> => {
  const d = driver();
  return d.writeData(name, rows).catch((err: any) => {
    if (process.env.DB_DRIVER === 'mysql') {
      handleDatabaseError(err);
    }
    throw err;
  });
};

export const transaction = <T>(fn: () => Promise<T>): Promise<T> => {
  const d = driver();
  return d.transaction(fn).catch((err: any) => {
    if (process.env.DB_DRIVER === 'mysql') {
      handleDatabaseError(err);
    }
    throw err;
  });
};

