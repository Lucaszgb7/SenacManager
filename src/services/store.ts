import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export type RecordData = Record<string, any>;
export type Collection = 'usuarios' | 'salas' | 'reservas' | 'aulas-grade' | 'inscricoes-noa';
export function dataPath(name: Collection): string {
  return path.join(process.env.DATA_DIR || path.resolve(__dirname, '../../src/data'), name + '.json');
}
// One application process owns the JSON data. Every read-modify-write operation
// uses this shared queue, including operations that validate other collections.
let pending: Promise<unknown> = Promise.resolve();
export function transaction<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation);
  pending = result.catch(() => undefined);
  return result;
}
export async function readFileRecords(filename: string): Promise<RecordData[]> {
  try {
    const body = await fs.readFile(filename, 'utf8');
    const rows: unknown = JSON.parse(body);
    if (!Array.isArray(rows)) throw new Error('Esperado um array JSON.');
    return rows;
  } catch (error: any) {
    if (error.code === 'ENOENT') return [];
    throw new Error('Dados inválidos em ' + path.basename(filename) + ': ' + error.message);
  }
}
export async function writeFileRecords(filename: string, rows: RecordData[]): Promise<void> {
  if (!Array.isArray(rows)) throw new Error('Esperado um array JSON.');
  await fs.mkdir(path.dirname(filename), { recursive: true });
  const temporary = filename + '.' + randomUUID() + '.tmp';
  try {
    await fs.writeFile(temporary, JSON.stringify(rows, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
    await fs.rename(temporary, filename);
  } finally {
    await fs.unlink(temporary).catch((e: NodeJS.ErrnoException) => { if (e.code !== 'ENOENT') throw e; });
  }
}
export const readData = (name: Collection) => readFileRecords(dataPath(name));
export const writeData = (name: Collection, rows: RecordData[]) => writeFileRecords(dataPath(name), rows);
