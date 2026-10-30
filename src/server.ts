import 'dotenv/config';
import app from './app';
import { getPool } from './database/connection';

if (process.env.DB_DRIVER === 'mysql' && process.env.DB_PASSWORD !== 'coloque_sua_senha_aqui') {
  try {
    getPool();
  } catch (err) {
    console.warn('[AI Studio] Falha ao iniciar pool MySQL:', err);
  }
}

const envPort = Number(process.env.PORT);
const port = (!envPort || envPort === 8080) ? 3000 : envPort;
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');

app.listen(port, '0.0.0.0', () => console.log('SenacManager disponível em http://0.0.0.0:' + port));
