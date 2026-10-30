import { getPool } from '../../database/connection';
import * as mysql from '../../database/mysqlStore';
import * as json from '../../database/jsonStore';
import * as store from '../../services/store';

jest.mock('../../database/connection', () => ({ getPool: jest.fn() }));
jest.mock('../../database/jsonStore', () => ({ readData: jest.fn(), writeData: jest.fn(), transaction: jest.fn() }));
const pool = { execute: jest.fn(), getConnection: jest.fn() };
const failure = Object.assign(new Error('MySQL indisponível'), { code: 'ECONNREFUSED' });
const savedDataDir = process.env.DATA_DIR;
const savedDriver = process.env.DB_DRIVER;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.DATA_DIR = '/tmp/should-not-select-json';
  (getPool as jest.Mock).mockReturnValue(pool);
  pool.execute.mockRejectedValue(failure);
  pool.getConnection.mockRejectedValue(failure);
});
afterAll(() => {
  if (savedDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = savedDataDir;
  if (savedDriver === undefined) delete process.env.DB_DRIVER;
  else process.env.DB_DRIVER = savedDriver;
});
test('MySQL informa falha de leitura sem selecionar JSON mesmo com DATA_DIR', async () => {
  await expect(mysql.readData('salas')).rejects.toBe(failure);
  expect(pool.execute).toHaveBeenCalled();
  expect(json.readData).not.toHaveBeenCalled();
});
test('falhas de gravação e seed não escrevem em JSON', async () => {
  await expect(mysql.writeData('salas', [])).rejects.toBe(failure);
  await expect(mysql.upsertData('salas', [])).rejects.toBe(failure);
  expect(json.writeData).not.toHaveBeenCalled();
});
test('transação não executa a operação se não conseguir conectar', async () => {
  const operation = jest.fn();
  await expect(mysql.transaction(operation)).rejects.toBe(failure);
  expect(operation).not.toHaveBeenCalled();
  expect(json.transaction).not.toHaveBeenCalled();
});
test('store com DB_DRIVER=mysql rejeita com erro controlado e jamais faz fallback para JSON', async () => {
  process.env.DB_DRIVER = 'mysql';

  // Leitura falha de forma controlada sem ler JSON
  await expect(store.readData('salas')).rejects.toThrow('Banco de dados indisponível');
  expect(json.readData).not.toHaveBeenCalled();

  // Gravação falha de forma controlada sem gravar em JSON
  await expect(store.writeData('salas', [])).rejects.toThrow('Banco de dados indisponível');
  expect(json.writeData).not.toHaveBeenCalled();

  // Transação falha de forma controlada sem executar fallback em JSON
  const operation = jest.fn();
  await expect(store.transaction(operation)).rejects.toThrow('Banco de dados indisponível');
  expect(operation).not.toHaveBeenCalled();
  expect(json.transaction).not.toHaveBeenCalled();
});

