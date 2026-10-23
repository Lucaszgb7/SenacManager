import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { definitions, toDatabase, fromDatabase } from '../../database/mappers';
import { Collection } from '../../database/types';

const collections = Object.keys(definitions) as Collection[];
test.each(collections)('round-trip preserva todos os registros JSON: %s', name => {
  const rows = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data', name + '.json'), 'utf8'));
  for (const row of rows) expect(fromDatabase(name, toDatabase(name, row))).toEqual(row);
});
test('mantém milissegundos e interpreta DATETIME em UTC', () => {
  expect(fromDatabase('usuarios', { criado_em: '2026-10-20 23:59:59.123' }).criadoEm).toBe('2026-10-20T23:59:59.123Z');
});
test('não desloca data e remove segundos dos horários', () => {
  expect(fromDatabase('reservas', { data: '2026-10-20', horario_inicio: '08:30:00', horario_fim: '09:45:00' })).toEqual({ data: '2026-10-20', horarioInicio: '08:30', horarioFim: '09:45' });
});
test('normaliza e-mail antes de persistir', () => {
  expect(toDatabase('usuarios', { email: ' CARLOS@SENAC.BR ' }).email).toBe('carlos@senac.br');
});
test.each([0, 1])('converte booleanos SQL reais: %s', value => {
  expect(fromDatabase('aulas-grade', { ativa: value, is_noa: value })).toEqual({ ativa: Boolean(value), isNoa: Boolean(value) });
});
test('aceita arrays já decodificados pelo mysql2', () => {
  expect(fromDatabase('salas', { recursos: ['projetor'] }).recursos).toEqual(['projetor']);
});
test('distingue campo ausente de null explícito', () => {
  const input = { id: 'u1', telefone: null };
  expect(fromDatabase('usuarios', toDatabase('usuarios', input))).toEqual(input);
});
test('descrição e vagas de NOA permanecem disponíveis', () => {
  const input = { id: 'a1', descricao: 'Oficina', vagasTotal: 7, ativa: false, isNoa: true };
  expect(fromDatabase('aulas-grade', toDatabase('aulas-grade', input))).toEqual(input);
});
test('hash de desenvolvimento autentica os cinco usuários', async () => {
  const rows = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/usuarios.json'), 'utf8'));
  for (const row of rows) expect(await bcrypt.compare('123456', row.senhaHash)).toBe(true);
});
