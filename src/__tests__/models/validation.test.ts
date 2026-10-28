import { validarDataReserva } from '../../services/validation';

afterEach(() => jest.useRealTimers());

test('datas de reserva usam o calendário e o dia escolar em São Paulo', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-29T01:00:00Z'));
  expect(validarDataReserva('2026-10-28')).toBe(true);
  expect(validarDataReserva('2026-10-27')).toBe(false);
  expect(validarDataReserva('2027-02-29')).toBe(false);
  expect(validarDataReserva('2028-02-29')).toBe(true);
  expect(validarDataReserva('2027-04-31')).toBe(false);
  expect(validarDataReserva('2027-13-01')).toBe(false);
});
