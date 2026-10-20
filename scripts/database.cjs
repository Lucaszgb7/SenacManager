const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const compiled = path.join(root, 'dist/scripts/database.js');
// O build é preferido; sem dist, usa o ts-node instalado com ts-node-dev.
const args = fs.existsSync(compiled) ? [compiled] : ['-r', 'ts-node/register', path.join(root, 'src/scripts/database.ts')];
const result = spawnSync(process.execPath, [...args, ...process.argv.slice(2)], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
