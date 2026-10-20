import fs from 'fs/promises';
import path from 'path';
import { getPool } from './connection';
export async function initializeSchema(): Promise<void> {
  const sql = await fs.readFile(path.resolve(__dirname, '../../database/schema.sql'), 'utf8');
  // O arquivo versionado contém apenas DDL estático; valores de usuário nunca entram aqui.
  for (const statement of sql.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean)) {
    await getPool().query(statement);
  }
}
