import 'dotenv/config';
import app from './app';
import { getPool } from './database/connection';

async function startServer(): Promise<void> {
  const envPort = Number(process.env.PORT);
  const port = (!envPort || envPort === 8080) ? 3000 : envPort;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT inválida.');
  }

  // Quando DB_DRIVER=mysql, valida a conexão real com o banco antes de iniciar o servidor
  if (process.env.DB_DRIVER === 'mysql') {
    try {
      const pool = getPool();
      const connection = await pool.getConnection();
      try {
        await connection.ping();
      } finally {
        connection.release();
      }
      console.log('[Banco de Dados] Conexão com o MySQL verificada com sucesso.');
    } catch (err: any) {
      const errorCode = err?.code || 'FALHA_CONEXAO';
      // Sanitiza mensagem para jamais expor senhas ou credenciais de conexão
      const safeMessage = String(err?.message || 'Falha ao estabelecer conexão.')
        .replace(/:[^:@/]+@/, ':***@');
      console.error(`[Inicialização] Erro ao conectar ao MySQL (${errorCode}): ${safeMessage}`);
      console.error('[Inicialização] A aplicação requer MySQL acessível quando DB_DRIVER=mysql.');
      process.exit(1);
    }
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SenacManager disponível em http://0.0.0.0:${port}`);
  });
}

startServer().catch((err: any) => {
  const safeMessage = String(err?.message || err).replace(/:[^:@/]+@/, ':***@');
  console.error('[Inicialização] Falha crítica ao inicializar servidor:', safeMessage);
  process.exit(1);
});

