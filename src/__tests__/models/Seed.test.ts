import fs from 'fs';
import path from 'path';
import { Professor } from '../../models/Professor';
import { Aluno } from '../../models/Aluno';
import { Administrador } from '../../models/Administrador';
import { Reserva } from '../../models/Reserva';
import { AulaGrade } from '../../models/AulaGrade';
const read = (name: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data', name + '.json'), 'utf8'));
test('todos os usu?rios fornecidos s?o compat?veis com os modelos', () => {
  for (const u of read('usuarios')) expect(() => (u.perfil === 'professor' ? Professor : u.perfil === 'aluno' ? Aluno : Administrador).fromJSON(u)).not.toThrow();
});
test('todas as reservas e aulas fornecidas podem ser carregadas', () => {
  for (const r of read('reservas')) expect(() => Reserva.fromJSON(r)).not.toThrow();
  for (const a of read('aulas-grade')) expect(() => AulaGrade.fromJSON(a)).not.toThrow();
});
test('reconstru??o preserva telefone e avatar', () => {
  const professor = Professor.fromJSON({ nome: 'Professor Teste', email: 'teste@example.com', senhaHash: 'x'.repeat(60), telefone: '11999999999', fotoUrl: '/uploads/avatars/test.png' });
  expect(professor.toJSON()).toMatchObject({ telefone: '11999999999', fotoUrl: '/uploads/avatars/test.png' });
});
