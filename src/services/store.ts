import * as json from '../database/jsonStore';
import * as mysql from '../database/mysqlStore';
import { Collection, RecordData } from '../database/types';
export type { Collection, RecordData } from '../database/types';
export { dataPath, readFileRecords, writeFileRecords } from '../database/jsonStore';

function driver() {
  const name = process.env.DB_DRIVER || 'json';
  if (name === 'json') return json;
  if (name === 'mysql') {
    if (process.env.DB_PASSWORD === 'coloque_sua_senha_aqui') {
      return json;
    }
    return mysql;
  }
  throw new Error('DB_DRIVER inválido. Use json ou mysql.');
}

function handleDbError(err: any): boolean {
  return (
    err?.code === 'ECONNREFUSED' ||
    err?.code === 'ENOTFOUND' ||
    err?.code === 'ETIMEDOUT' ||
    err?.code === 'ER_ACCESS_DENIED_ERROR' ||
    Boolean(err?.message?.includes('Configuração MySQL incompleta'))
  );
}

export const readData = (name: Collection): Promise<RecordData[]> => {
  const d = driver();
  try {
    return d.readData(name).catch((err: any) => {
      if (handleDbError(err)) {
        console.warn('[AI Studio] MySQL indisponível — usando JSON store');
        return json.readData(name);
      }
      throw err;
    });
  } catch (err: any) {
    if (handleDbError(err)) {
      console.warn('[AI Studio] MySQL indisponível — usando JSON store');
      return json.readData(name);
    }
    throw err;
  }
};

export const writeData = (name: Collection, rows: RecordData[]): Promise<void> => {
  const d = driver();
  try {
    return d.writeData(name, rows).catch((err: any) => {
      if (handleDbError(err)) {
        console.warn('[AI Studio] MySQL indisponível — usando JSON store');
        return json.writeData(name, rows);
      }
      throw err;
    });
  } catch (err: any) {
    if (handleDbError(err)) {
      console.warn('[AI Studio] MySQL indisponível — usando JSON store');
      return json.writeData(name, rows);
    }
    throw err;
  }
};

export const transaction = <T>(fn: () => Promise<T>): Promise<T> => {
  const d = driver();
  try {
    return d.transaction(fn).catch((err: any) => {
      if (handleDbError(err)) {
        console.warn('[AI Studio] MySQL indisponível — usando JSON store');
        return json.transaction(fn);
      }
      throw err;
    });
  } catch (err: any) {
    if (handleDbError(err)) {
      console.warn('[AI Studio] MySQL indisponível — usando JSON store');
      return json.transaction(fn);
    }
    throw err;
  }
};
