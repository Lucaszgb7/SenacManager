import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { getPool, closePool } from '../../database/connection';
import { initializeSchema } from '../../database/schema';
import { readData, writeData, transaction, upsertData } from '../../database/mysqlStore';
import { definitions } from '../../database/mappers';
import { Collection, RecordData } from '../../database/types';
import { ReservaRepository } from '../../repositories/ReservaRepository';
import { Reserva } from '../../models/Reserva';

const suite = process.env.MYSQL_TEST_URL ? describe : describe.skip;
suite('MySQL real em banco dedicado de teste', () => {
  const saved = { ...process.env };
  const collections = Object.keys(definitions) as Collection[];
  const fixtures: Partial<Record<Collection, RecordData[]>> = {};
  beforeAll(async () => {
    const url = new URL(process.env.MYSQL_TEST_URL!);
    const database = decodeURIComponent(url.pathname.slice(1));
    if (!/^[a-zA-Z0-9_]*test[a-zA-Z0-9_]*$/i.test(database)) throw new Error('MYSQL_TEST_URL deve apontar para um banco dedicado com test no nome.');
    Object.assign(process.env, { DB_DRIVER: 'mysql', DB_HOST: url.hostname, DB_PORT: url.port || '3306',
      DB_USER: decodeURIComponent(url.username), DB_PASSWORD: decodeURIComponent(url.password), DB_NAME: database });
    await initializeSchema();
    for (const name of collections) fixtures[name] = JSON.parse(await fs.readFile(path.resolve(__dirname, '../../data', name + '.json'), 'utf8'));
    fixtures['inscricoes-noa'] = [{ id: randomUUID(), alunoId: fixtures.usuarios![2]!.id, aulaId: fixtures['aulas-grade']![0]!.id, criadoEm: '2026-10-20T12:00:00.123Z' }];
  });
  beforeEach(async () => {
    await transaction(async () => {
      for (const name of [...collections].reverse()) await writeData(name, []);
      for (const name of collections) await writeData(name, fixtures[name]!);
    });
  });
  afterAll(async () => {
    try {
      if (process.env.DB_NAME?.includes('test')) {
        await transaction(async () => { for (const name of [...collections].reverse()) await writeData(name, []); });
      }
    } finally { await closePool(); process.env = saved; }
  });
  test.each(collections)('round-trip exato de %s', async name => {
    expect(await readData(name)).toEqual(fixtures[name]);
  });
  test('UPSERT atualiza e DELETE remove linhas ausentes', async () => {
    const next = { ...fixtures.reservas![0], observacoes: 'Alteração persistida' };
    await writeData('reservas', [next]);
    expect(await readData('reservas')).toEqual([next]);
    await writeData('reservas', []);
    expect(await readData('reservas')).toEqual([]);
  });
  test('rollback desfaz alterações em várias coleções', async () => {
    await expect(transaction(async () => {
      await writeData('reservas', []);
      await writeData('salas', fixtures.salas!.map(s => ({ ...s, nome: 'Alterada' })));
      throw new Error('Erro provocado');
    })).rejects.toThrow('Erro provocado');
    expect(await readData('reservas')).toEqual(fixtures.reservas);
    expect(await readData('salas')).toEqual(fixtures.salas);
  });
  test('repository preserva gravações concorrentes sem perder reservas', async () => {
    await writeData('reservas', []);
    const repo = new ReservaRepository();
    await Promise.all(Array.from({ length: 12 }, (_, i) => repo.criar(new Reserva(fixtures.salas![0]!.id, fixtures.usuarios![0]!.id, 'Redes', 'DS-A', '2099-06-10', '08:00', '09:00', 'confirmada', randomUUID()))));
    expect(await repo.listarTodas()).toHaveLength(12);
  });
  test('e-mail duplicado é recusado sem alterar a coleção', async () => {
    await expect(writeData('usuarios', [...fixtures.usuarios!, { ...fixtures.usuarios![0], id: randomUUID() }])).rejects.toThrow('E-mail já cadastrado');
    expect(await readData('usuarios')).toEqual(fixtures.usuarios);
  });
  test('índice UNIQUE recusa duplicata mesmo em SQL direto', async () => {
    const u = fixtures.usuarios![0]!;
    await expect(getPool().execute('INSERT INTO usuarios (id, nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?, ?)', [randomUUID(), u.nome, u.email.toUpperCase(), u.senhaHash, u.perfil])).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });
  test('seed é idempotente e mantém registros adicionais', async () => {
    const extra = { ...fixtures.salas![0], id: randomUUID(), nome: 'Sala adicional' };
    await writeData('salas', [...fixtures.salas!, extra]);
    await upsertData('salas', fixtures.salas!);
    await upsertData('salas', fixtures.salas!);
    expect(await readData('salas')).toHaveLength(fixtures.salas!.length + 1);
    expect((await readData('salas')).find(s => s.id === extra.id)).toEqual(extra);
  });
  test('FK impede apagar sala vinculada e faz rollback do UPSERT', async () => {
    await expect(writeData('salas', [])).rejects.toMatchObject({ code: 'ER_ROW_IS_REFERENCED_2' });
    expect(await readData('salas')).toEqual(fixtures.salas);
  });
});
