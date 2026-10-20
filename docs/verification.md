# Entrega e verificação — 20/10/2026

Implementadas as Partes A e B. JSON continua sendo o padrão sem configuração; `.env.example`
seleciona MySQL. A API pública de store e as funções do SchoolService foram preservadas.
Alterações organizadas em commits por tema. Nenhum segredo real foi gravado.

## Saídas verificadas

Ao concluir somente a Parte A:

```text
npx tsc --noEmit: sem erros
Test Suites: 8 passed, 8 total
Tests:       43 passed, 43 total
```

Verificação final (Windows usa npx.cmd/npm.cmd):

```text
npx tsc --noEmit: exit 0 (sem erros)

npx jest (DB_DRIVER=json)
Test Suites: 1 skipped, 10 passed, 10 of 11 total
Tests:       12 skipped, 63 passed, 75 total
Snapshots:   0 total
Ran all test suites.

npm run build
> senac-manager@1.0.0 build
> node scripts/build.cjs
exit 0

npx jest src/__tests__/database --runInBand
Test Suites: 1 skipped, 2 passed, 2 of 3 total
Tests:       12 skipped, 18 passed, 30 total
```

O Jest sem `--runInBand` inicialmente encontrou `spawn EPERM` na sandbox; a repetição com
permissão de execução passou. O smoke também precisou dessa permissão para iniciar subprocessos.

`node scripts/runtime-smoke.cjs` usa os mesmos executáveis e argumentos dos scripts
`npm run dev` e `npm start`, em JSON temporário, com esta saída:

```text
npm run dev (json): [INFO] ts-node-dev ver. 2.0.0 (ts-node 10.9.2, typescript 5.9.3)
SenacManager disponível em http://localhost:3219
POST login carlos.silva@senac.br: 302 /dashboard
GET /dashboard: 200
GET /rooms/available: 200
GET /bookings/my: 200
GET /profile: 200
GET /admin: 403
POST login roberto.ferreira@senac.br: 302 /dashboard
GET /admin administrador: 200
npm start (json): SenacManager disponível em http://localhost:3219
POST login carlos.silva@senac.br: 302 /dashboard
```

## Não verificado

Docker não está instalado (`docker` não reconhecido). O serviço Windows MySQL80 está em
execução, mas não há `.env` configurado nem `MYSQL_TEST_URL`. O usuário escolheu explicitamente
finalizar com MySQL não verificado. Portanto:

- Não executados `docker compose up -d`, `db:init`, `db:seed` e `db:reset` contra MySQL.
- Não executados login/páginas/permissões HTTP com DB_DRIVER=mysql.
- Não verificada persistência de reserva após reiniciar servidor com MySQL.
- Não executados os 12 testes de integração MySQL (condicionalmente pulados).
- Scripts compilados pelo build; os comandos de banco via ts-node não foram validados contra um banco real.
- Sessões MySQL opcionais (B5) não implementadas; MemoryStore, cookie e lembrar-me preservados.

Os testes de mappers e configuração não substituem a integração com um servidor MySQL.
GET_LOCK é liberado explicitamente, inclusive após rollback, conforme a
[documentação oficial MySQL](https://dev.mysql.com/doc/refman/8.0/en/locking-functions.html).
Pool e prepared statements seguem a
[documentação do mysql2](https://sidorares.github.io/node-mysql2/docs/examples/connections/create-pool).

## Arquivos criados ou alterados

| Arquivo | Motivo |
| --- | --- |
| `src/app.ts` | Referenciar a declaração express-session na primeira linha. |
| `src/routes/authRoutes.ts` | Exigir autenticação e perfil administrador no cadastro. |
| `src/data/usuarios.json` | Hash real nos cinco usuários; curso/turma nos alunos; disciplinas dos professores como arrays. |
| `src/services/store.ts` | Selecionar json/mysql mantendo as funções públicas e exports auxiliares legados. |
| `src/database/types.ts` | Compartilhar Collection e RecordData sem dependência circular. |
| `src/database/jsonStore.ts` | Extrair a implementação original e centralizar DATA_DIR/dataPath. |
| `src/database/connection.ts` | Pool lazy, validação de env, UTC/dateStrings e encerramento. |
| `src/database/mappers.ts` | Mapear as cinco coleções, camelCase, arrays, booleanos, datas e campos opcionais. |
| `src/database/mysqlStore.ts` | UPSERT/DELETE atômicos, AsyncLocalStorage, GET_LOCK, rollback e proteção de índices únicos. |
| `src/database/schema.ts` | Aplicar DDL estático idempotente sem habilitar multipleStatements. |
| `src/repositories/BaseRepository.ts` | Ler/gravar por nome de coleção usando a API comum. |
| `src/repositories/UsuarioRepository.ts` | Usar coleção usuarios/DATA_DIR comum e reconhecer administrador. |
| `src/repositories/SalaRepository.ts` | Usar coleção salas em ambos os drivers. |
| `src/repositories/ReservaRepository.ts` | Usar coleção reservas preservando transações concorrentes. |
| `src/repositories/AulaGradeRepository.ts` | Eliminar caminho/DATA_DIR duplicado e usar aulas-grade. |
| `database/schema.sql` | Cinco tabelas InnoDB, índices, JSON, FKs RESTRICT e metadados de formato/ordem. |
| `.env.example` | Exemplo sem segredos reais, incluindo DB_DRIVER=mysql. |
| `docker-compose.yml` | MySQL 8, volume persistente, healthcheck e schema inicial. |
| `src/server.ts` | Carregar dotenv e validar configuração MySQL antes de iniciar HTTP. |
| `src/scripts/database.ts` | Implementar init, seed idempotente e reset em ordem de FKs. |
| `scripts/database.cjs` | Executar scripts compilados ou via ts-node na ausência de dist. |
| `src/scripts/create-admin.ts` | Carregar dotenv e encerrar pool; usa a mesma API nos dois drivers. |
| `package.json` | Adicionar dotenv e db:init/db:seed/db:reset. |
| `package-lock.json` | Registrar dotenv compatível com o CommonJS existente. |
| `src/config/session.ts` | Documentar MemoryStore nos dois drivers, sem mudar comportamento. |
| `src/__tests__/integration/application.test.ts` | Cobrir 403 no cadastro para professor e aluno. |
| `src/__tests__/database/mappers.test.ts` | Round-trip dos seeds, formatos, opcionais e autenticação dos hashes sem MySQL. |
| `src/__tests__/database/configuration.test.ts` | Validar configuração, UTC/dateStrings, porta e driver inválido sem MySQL. |
| `src/__tests__/database/mysqlStore.test.ts` | Integração condicional: cinco coleções, rollback, concorrência, UNIQUE, FKs e seed. |
| `scripts/runtime-smoke.cjs` | Verificar servidores e HTTP com JSON temporário. |
| `README.md` | Configuração MySQL/JSON, comandos, desenvolvimento, testes e limites operacionais. |
| `docs/implementation-plan.md` | Registrar escopo e progresso da implementação. |
| `docs/verification.md` | Registrar entrega, evidências e verificações pendentes. |

## Commits sugeridos

1. `fix: corrigir sessão, autorização e usuários de desenvolvimento`
2. `feat: adicionar driver MySQL e schema preservando modo JSON`
3. `feat: adicionar configuração, compose e scripts de banco`
4. `test: cobrir mappers, configuração, autorização e persistência MySQL`
5. `docs: documentar MySQL, modo JSON e verificações da entrega`

O segundo commit deve incluir pool/mappers/drivers/repositories/schema; o terceiro inclui
dotenv/package-lock, scripts, servidor e Compose. O quarto inclui o smoke HTTP.
