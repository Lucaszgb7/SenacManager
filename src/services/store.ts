import * as json from '../database/jsonStore';
import * as mysql from '../database/mysqlStore';
import { Collection, RecordData } from '../database/types';
export type { Collection, RecordData } from '../database/types';
export { dataPath, readFileRecords, writeFileRecords } from '../database/jsonStore';
function driver() {
  const name = process.env.DB_DRIVER || 'json';
  if (name === 'json') return json;
  if (name === 'mysql') return mysql;
  throw new Error('DB_DRIVER inválido. Use json ou mysql.');
}
export const readData = (name: Collection) => driver().readData(name);
export const writeData = (name: Collection, rows: RecordData[]) => driver().writeData(name, rows);
export const transaction = <T>(fn: () => Promise<T>): Promise<T> => driver().transaction(fn);
