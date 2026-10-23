import { AsyncLocalStorage } from 'async_hooks';
import { createHash } from 'crypto';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { getPool } from './connection';
import { definitions, toDatabase, fromDatabase } from './mappers';
import { Collection, RecordData } from './types';
import * as json from './jsonStore';

let useFallback = false;
export function setUseFallback(val: boolean) { useFallback = val; }
export function shouldUseFallback(): boolean {
  if (Boolean(process.env.DATA_DIR)) return true;
  return useFallback;
}

function isConnectionError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '');
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    code === 'EHOSTUNREACH' ||
    code === 'ECONNRESET' ||
    code.startsWith('PROTOCOL_') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ENOTFOUND')
  );
}

const context = new AsyncLocalStorage<PoolConnection>();

export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  if (shouldUseFallback()) return json.transaction(fn);
  if (context.getStore()) return fn();

  let connection: PoolConnection;
  try {
    connection = await getPool().getConnection();
  } catch (error) {
    if (isConnectionError(error)) {
      console.warn('[AI Studio] MySQL offline (' + ((error as any).code || (error as any).message) + ') — using jsonStore');
      useFallback = true;
      return json.transaction(fn);
    }
    throw error;
  }

  let locked = false;
  let begun = false;
  // Bloqueio por banco entre processos, adquirido antes de iniciar o snapshot.
  const lock = 'senac:' + createHash('sha256').update(process.env.DB_NAME || 'senac').digest('hex').slice(0, 48);
  try {
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT GET_LOCK(?, ?) AS acquired', [lock, 30]);
    if (Number(rows[0]?.acquired) !== 1) throw new Error('Não foi possível obter o bloqueio de gravação MySQL.');
    locked = true;
    await connection.beginTransaction();
    begun = true;
    const result = await context.run(connection, fn);
    await connection.commit();
    begun = false;
    return result;
  } catch (error) {
    if (begun) await connection.rollback();
    throw error;
  } finally {
    try {
      if (locked) await connection.execute('SELECT RELEASE_LOCK(?)', [lock]);
      connection.release();
    } catch (error) {
      // Uma conexão cujo desbloqueio falhou nunca deve voltar ao pool.
      connection.destroy();
      throw error;
    }
  }
}

export async function readData(name: Collection): Promise<RecordData[]> {
  if (shouldUseFallback()) return json.readData(name);
  try {
    const { table } = definitions[name];
    const [rows] = await (context.getStore() || getPool()).execute<RowDataPacket[]>(`SELECT * FROM \`${table}\` ORDER BY ordem, id`);
    return rows.map(row => fromDatabase(name, row));
  } catch (error) {
    if (isConnectionError(error)) {
      console.warn('[AI Studio] MySQL offline — using jsonStore');
      useFallback = true;
      return json.readData(name);
    }
    throw error;
  }
}

// Seed importa sem excluir registros criados após a primeira importação.
export async function upsertData(name: Collection, rows: RecordData[]): Promise<void> {
  if (shouldUseFallback()) {
    const existing = await json.readData(name);
    const existingMap = new Map(existing.map(r => [r.id, r]));
    for (const row of rows) {
      if (name === 'usuarios') {
        const dup = existing.find(u => u.email === row.email && u.id !== row.id);
        if (dup) throw new Error('E-mail já cadastrado.');
      }
      if (name === 'inscricoes-noa') {
        const dup = existing.find(i => i.alunoId === row.alunoId && i.aulaId === row.aulaId && i.id !== row.id);
        if (dup) throw new Error('Aluno já inscrito nesta aula.');
      }
      existingMap.set(row.id, row);
    }
    await json.writeData(name, Array.from(existingMap.values()));
    return;
  }
  if (!context.getStore()) return transaction(() => upsertData(name, rows));
  const connection = context.getStore()!;
  const { table } = definitions[name];
  for (const [index, row] of rows.entries()) {
    const data: RecordData = { ...toDatabase(name, row), ordem: index };
    const columns = Object.keys(data);
    // UNIQUE(email) não pode fazer o UPSERT atualizar silenciosamente outro id.
    if (name === 'usuarios') {
      const [existing] = await connection.execute<RowDataPacket[]>('SELECT id FROM usuarios WHERE email = ? AND id <> ?', [data.email, data.id]);
      if (existing.length) throw new Error('E-mail já cadastrado.');
    }
    if (name === 'inscricoes-noa') {
      const [existing] = await connection.execute<RowDataPacket[]>('SELECT id FROM inscricoes_noa WHERE aluno_id = ? AND aula_id = ? AND id <> ?', [data.aluno_id, data.aula_id, data.id]);
      if (existing.length) throw new Error('Aluno já inscrito nesta aula.');
    }
    const updates = columns.filter(c => c !== 'id').map(c => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');
    await connection.execute(`INSERT INTO \`${table}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${columns.map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${updates}`, Object.values(data));
  }
}

export async function writeData(name: Collection, rows: RecordData[]): Promise<void> {
  if (!Array.isArray(rows)) throw new Error('Esperado um array de registros.');
  if (shouldUseFallback()) return json.writeData(name, rows);
  try {
    return await transaction(async () => {
      await upsertData(name, rows);
      const { table } = definitions[name];
      const ids = rows.map(row => row.id);
      await context.getStore()!.execute(`DELETE FROM \`${table}\`${ids.length ? ` WHERE id NOT IN (${ids.map(() => '?').join(', ')})` : ''}`, ids);
    });
  } catch (error) {
    if (isConnectionError(error)) {
      console.warn('[AI Studio] MySQL offline — using jsonStore');
      useFallback = true;
      return json.writeData(name, rows);
    }
    throw error;
  }
}

