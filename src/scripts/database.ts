import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { initializeSchema } from '../database/schema';
import { getPool, closePool } from '../database/connection';
import { readData as readJson } from '../database/jsonStore';
import { transaction, upsertData } from '../database/mysqlStore';
import { Collection } from '../database/types';

const collections: Collection[] = ['usuarios','salas','reservas','aulas-grade','inscricoes-noa'];
async function main() {
  const action = process.argv[2];
  if (!['init','seed','reset'].includes(action || '')) throw new Error('Use init, seed ou reset.');
  if (action === 'reset') {
    // Exclusão explicitamente solicitada por db:reset, em ordem inversa das FKs.
    for (const table of ['inscricoes_noa','reservas','aulas_grade','salas','usuarios']) {
      await getPool().query(`DROP TABLE IF EXISTS \`${table}\``);
    }
  }
  if (action !== 'seed') await initializeSchema();
  if (action === 'seed') {
    const password = process.env.SEED_PASSWORD;
    if (password && password.length < 6) throw new Error('SEED_PASSWORD deve ter pelo menos 6 caracteres.');
    await transaction(async () => {
      for (const collection of collections) {
        const rows = await readJson(collection);
        if (collection === 'usuarios' && password) {
          const hash = await bcrypt.hash(password, 10);
          for (const row of rows) row.senhaHash = hash;
        }
        await upsertData(collection, rows);
      }
    });
  }
  console.log('Banco de dados: ' + action + ' concluído.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(closePool);
