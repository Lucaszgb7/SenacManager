// Verificação HTTP em JSON temporário, sem modificar os dados do projeto.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'senac-runtime-'));
fs.cpSync(path.join(root, 'src/data'), directory, { recursive: true });
const port = '3219';
const base = 'http://127.0.0.1:' + port;
const env = { ...process.env, DB_DRIVER: 'json', DATA_DIR: directory, PORT: port };
let child;
async function launch(args, label) {
  let output = '';
  child = spawn(process.execPath, args, { cwd: root, env, windowsHide: true, stdio: ['ignore','pipe','pipe'] });
  child.stdout.on('data', b => output += b);
  child.stderr.on('data', b => output += b);
  let spawnError;
  child.on('error', error => { spawnError = error; });
  for (let i = 0; i < 150; i++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (spawnError) throw spawnError;
    if (output.includes('SenacManager dispon')) { console.log(label + ': ' + output.trim()); return; }
    if (child.exitCode !== null) throw new Error(output);
  }
  throw new Error('Tempo de inicialização excedido: ' + output);
}
function stop() {
  if (child?.pid && child.exitCode === null) {
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else child.kill('SIGTERM');
  }
  child = undefined;
}
async function login(email) {
  const response = await fetch(base + '/auth/login', { method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: '123456' }) });
  console.log('POST login ' + email + ': ' + response.status + ' ' + response.headers.get('location'));
  if (response.status !== 302 || response.headers.get('location') !== '/dashboard') throw new Error('Falha de login.');
  return response.headers.get('set-cookie').split(';')[0];
}
async function main() {
  await launch(['node_modules/tsx/dist/cli.mjs', 'watch', 'src/server.ts'], 'npm run dev (json)');
  let cookie = await login('carlos.silva@senac.br');
  for (const route of ['/dashboard','/rooms/available','/bookings/my','/profile','/admin']) {
    const response = await fetch(base + route, { headers: { Cookie: cookie }, redirect: 'manual' });
    console.log('GET ' + route + ': ' + response.status);
    if (response.status !== (route === '/admin' ? 403 : 200)) throw new Error('Status HTTP inesperado.');
  }
  cookie = await login('roberto.ferreira@senac.br');
  const response = await fetch(base + '/admin', { headers: { Cookie: cookie } });
  console.log('GET /admin administrador: ' + response.status);
  if (response.status !== 200) throw new Error('Falha no painel administrativo.');
  stop();
  await launch(['dist/server.js'], 'npm start (json)');
  await login('carlos.silva@senac.br');
  stop();
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  stop();
  // Caminho exclusivo retornado por mkdtemp; nunca remove a pasta de dados real.
  fs.rmSync(directory, { recursive: true, force: true });
});
