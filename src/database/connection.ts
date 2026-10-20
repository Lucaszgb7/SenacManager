import { createPool, Pool } from 'mysql2/promise';
let pool: Pool | undefined;
export function databaseOptions() {
  const missing = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter(key => !process.env[key]);
  if (missing.length) throw new Error('Configuração MySQL incompleta: ' + missing.join(', ') + '.');
  const port = Number(process.env.DB_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('DB_PORT inválida.');
  return { host: process.env.DB_HOST!, port, user: process.env.DB_USER!, password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!, timezone: '+00:00', dateStrings: true, charset: 'utf8mb4', connectionLimit: 10 };
}
export function getPool(): Pool { return pool ??= createPool(databaseOptions()); }
export async function closePool(): Promise<void> { const current = pool; pool = undefined; await current?.end(); }
