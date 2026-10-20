import 'dotenv/config';
import app from './app';
import { getPool } from './database/connection';
if (process.env.DB_DRIVER === 'mysql') getPool();
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');
app.listen(port, () => console.log('SenacManager disponível em http://localhost:' + port));
