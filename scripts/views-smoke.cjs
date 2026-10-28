// Verifica o servidor compilado sem dist/views, sem alterar o build original.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const root = path.resolve(__dirname, '..');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'senac-views-'));
  let server;
  try {
    await fs.cp(path.join(root, 'dist'), path.join(temporary, 'dist'), {
      recursive: true, filter: source => source !== path.join(root, 'dist/views'),
    });
    await fs.mkdir(path.join(temporary, 'src'), { recursive: true });
    await fs.symlink(path.join(root, 'src/views'), path.join(temporary, 'src/views'), 'junction');
    await fs.symlink(path.join(root, 'node_modules'), path.join(temporary, 'node_modules'), 'junction');
    const app = require(path.join(temporary, 'dist/app.js')).default;
    await new Promise((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', resolve);
      server.once('error', reject);
    });
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/login');
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /name="email"/);
    assert.match(html, /name="password"/);
    console.log('Views OK: build sem dist/views renderiza auth/login a partir de src/views.');
  } finally {
    if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await fs.rm(temporary, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
