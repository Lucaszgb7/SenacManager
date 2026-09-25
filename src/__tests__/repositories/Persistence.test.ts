import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { Reserva } from '../../models/Reserva';
import { ReservaRepository } from '../../repositories/ReservaRepository';
import { Sala } from '../../models/Sala';
let directory: string;
beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'senac-repo-'));
  process.env.DATA_DIR = directory;
  await fs.writeFile(path.join(directory, 'reservas.json'), '[]');
});
afterEach(async () => { delete process.env.DATA_DIR; await fs.rm(directory, { recursive: true, force: true }); });
test('repository preserva gravacoes concorrentes sem perder reservas', async () => {
  const repo = new ReservaRepository();
  await Promise.all([
    repo.criar(new Reserva('s1', 'p1', 'Redes', 'A', '2099-06-10', '08:00', '09:00')),
    repo.criar(new Reserva('s1', 'p1', 'Redes', 'A', '2099-06-10', '09:00', '10:00')),
  ]);
  expect(await repo.listarTodas()).toHaveLength(2);
});
test('sala inativa permanece inativa depois de reconstruida', () => {
  const sala = Sala.fromJSON({ id: 's1', nome: 'Sala Teste', capacidade: 10, predio: 'A', ativa: false });
  expect(sala.toJSON().ativa).toBe(false);
});
