import { Reserva } from '../../models/Reserva';
const criarReserva = (status: 'confirmada' | 'cancelada' = 'confirmada') => new Reserva('sala-1', 'prof-1', 'Matemática', '  turma a ', '2025-06-10', '08:00', '10:00', status, 'res-1', new Date('2025-01-01T00:00:00.000Z'));
describe('Reserva', () => {
  it('valida e normaliza os dados do domínio', () => { const r = criarReserva(); expect(r.turma).toBe('TURMA A'); expect(r.status).toBe('confirmada'); });
  it.each([['data', () => new Reserva('s', 'p', 'TI', 'A', '2025-02-30', '08:00', '09:00')], ['hora', () => new Reserva('s', 'p', 'TI', 'A', '2025-02-01', '25:00', '09:00')], ['intervalo', () => new Reserva('s', 'p', 'TI', 'A', '2025-02-01', '10:00', '10:00')], ['status', () => new Reserva('s', 'p', 'TI', 'A', '2025-02-01', '08:00', '09:00', 'invalido' as never)]])('rejeita %s inválido', (_c, criar) => expect(criar).toThrow());
  it('cancela e serializa datas', () => { const r = criarReserva(); r.cancelar(); expect(r.status).toBe('cancelada'); expect(r.toJSON()).toMatchObject({ id: 'res-1', status: 'cancelada', criadoEm: '2025-01-01T00:00:00.000Z' }); });
  it('reconstrói com fromJSON', () => { const r = criarReserva('cancelada'); expect(Reserva.fromJSON(r.toJSON()).toJSON()).toEqual(r.toJSON()); });
});
