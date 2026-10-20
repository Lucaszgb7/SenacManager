import { databaseOptions } from '../../database/connection';
import { readData } from '../../services/store';
const saved = { ...process.env };
beforeEach(() => {
  Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_USER: 'teste', DB_PASSWORD: 'senha-de-teste', DB_NAME: 'senac_test' });
  delete process.env.DB_PORT;
});
afterEach(() => { process.env = { ...saved }; });
test('pool fixa UTC, dateStrings e porta padrão', () => {
  expect(databaseOptions()).toMatchObject({ timezone: '+00:00', dateStrings: true, port: 3306 });
});
test('configuração incompleta nomeia variável ausente sem revelar senha', () => {
  delete process.env.DB_HOST;
  expect(databaseOptions).toThrow('Configuração MySQL incompleta: DB_HOST.');
});
test('porta inválida falha antes de abrir conexão', () => {
  process.env.DB_PORT = '0';
  expect(databaseOptions).toThrow('DB_PORT inválida.');
});
test('driver desconhecido gera mensagem clara', () => {
  process.env.DB_DRIVER = 'sqlite';
  expect(() => readData('salas')).toThrow('DB_DRIVER inválido. Use json ou mysql.');
});
