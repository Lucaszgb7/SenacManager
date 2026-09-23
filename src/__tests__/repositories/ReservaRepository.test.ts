import { promises as fs } from 'fs';
import { Reserva } from '../../models/Reserva';
import { ReservaRepository } from '../../repositories/ReservaRepository';
jest.mock('fs', () => ({ promises: { readFile: jest.fn(), writeFile: jest.fn() } }));
const readFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>; const writeFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
const reserva = (id: string, inicio = '08:00', fim = '10:00', status: 'confirmada' | 'cancelada' = 'confirmada') => new Reserva('sala-1', 'prof-1', 'TI', 'A', '2025-06-10', inicio, fim, status, id);
describe('ReservaRepository', () => {
  beforeEach(() => jest.clearAllMocks());
  it('lista e filtra reservas usando fs mockado', async () => { readFile.mockResolvedValue(JSON.stringify([reserva('r1').toJSON(), reserva('r2').toJSON()]) as never); const repo = new ReservaRepository(); expect((await repo.listarPorProfessor('prof-1')).map(r => r.id)).toEqual(['r1', 'r2']); expect(await repo.buscarPorId('ausente')).toBeNull(); expect(readFile).toHaveBeenCalled(); });
  it('cria e persiste sem tocar em JSON real', async () => { readFile.mockResolvedValue('[]' as never); writeFile.mockResolvedValue(undefined); const r = reserva('novo'); expect(await new ReservaRepository().criar(r)).toBe(r); expect(writeFile).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('"id": "novo"'), 'utf-8'); });
  it('detecta conflitos e cancela', async () => { readFile.mockResolvedValue(JSON.stringify([reserva('ativo').toJSON(), reserva('cancelado', '09:00', '11:00', 'cancelada').toJSON()]) as never); const repo = new ReservaRepository(); expect(await repo.existeConflito('sala-1', '2025-06-10', '09:30', '09:45')).toBe(true); expect(await repo.existeConflito('sala-1', '2025-06-10', '10:00', '11:00')).toBe(false); writeFile.mockResolvedValue(undefined); expect((await repo.cancelar('ativo'))?.status).toBe('cancelada'); expect(await repo.cancelar('inexistente')).toBeNull(); });
});
