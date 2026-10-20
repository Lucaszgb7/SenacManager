import 'dotenv/config';
import { saveUser } from '../services/SchoolService';
import { closePool } from '../database/connection';
async function main() {
  const [nome, email] = process.argv.slice(2);
  const senha = process.env.SENAC_ADMIN_PASSWORD;
  if (!nome || !email || !senha) throw new Error('Informe nome e e-mail como argumentos e a senha pela variável SENAC_ADMIN_PASSWORD (mínimo 8 caracteres).');
  await saveUser({ nome, email, senha, perfil: 'administrador', ativo: true });
  console.log('Administrador criado. A senha não foi exibida nem gravada em texto puro.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(closePool);
