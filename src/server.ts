import 'dotenv/config';
import app from './app';
import { getPool } from './database/connection';
if (process.env.DB_DRIVER === 'mysql') {
  try {
    getPool();
  } catch (err) {
    console.warn('[AI Studio] MySQL not configured or offline:', err);
  }
}
const rawPort = process.env.PORT;
const port = Number((rawPort && rawPort !== '8080') ? rawPort : 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');
app.listen(port, '0.0.0.0', () => console.log('SenacManager disponível em http://0.0.0.0:' + port));
