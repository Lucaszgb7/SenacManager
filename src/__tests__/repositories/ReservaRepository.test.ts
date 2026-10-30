import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Reserva } from '../../models/Reserva';
import { ReservaRepository } from '../../repositories/ReservaRepository';
const reserva = (id: string, inicio = '08:00', fim = '10:00', status: 'confirmada' | 'cancelada' = 'confirmada') => new Reserva('sala-1', 'prof-1', 'TI', 'A', '2025-06-10', inicio, fim, status, id);
let directory: string;
const savedDriver = process.env.DB_DRIVER;
beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'senac-reservas-'));
  process.env.DATA_DIR = directory;
  process.env.DB_DRIVER = 'json';
});
afterEach(async () => {
  delete process.env.DATA_DIR;
  if (savedDriver === undefined) delete process.env.DB_DRIVER;
  else process.env.DB_DRIVER = savedDriver;
  await fs.rm(directory, { recursive: true, force: true });
});
async function seed(rows: Reserva[]) { await fs.writeFile(path.join(directory, 'reservas.json'), JSON.stringify(rows.map(r => r.toJSON()))); }
describe('ReservaRepository', () => {
  it('lista e filtra reservas persistidas', async () => {
    await seed([reserva('r1'), reserva('r2')]);
    const repo = new ReservaRepository();
    expect((await repo.listarPorProfessor('prof-1')).map(r => r.id)).toEqual(['r1','r2']);
    expect(await repo.buscarPorId('ausente')).toBeNull();
  });
  it('cria e persiste em arquivo isolado', async () => {
    await seed([]);
    const repo = new ReservaRepository(), r = reserva('novo');
    expect(await repo.criar(r)).toBe(r);
    expect((await repo.buscarPorId('novo'))?.disciplina).toBe('TI');
  });
  it('detecta conflitos e cancela sem remover o historico', async () => {
    await seed([reserva('ativo'), reserva('cancelado','09:00','11:00','cancelada')]);
    const repo = new ReservaRepository();
    expect(await repo.existeConflito('sala-1','2025-06-10','09:30','09:45')).toBe(true);
    expect(await repo.existeConflito('sala-1','2025-06-10','10:00','11:00')).toBe(false);
    expect((await repo.cancelar('ativo'))?.status).toBe('cancelada');
    expect((await repo.buscarPorId('ativo'))?.status).toBe('cancelada');
    expect(await repo.cancelar('inexistente')).toBeNull();
  });
});
