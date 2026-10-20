# SenacManager

Aplicação escolar em TypeScript, Express e EJS, com MySQL ou arquivos JSON. Sem configuração, `DB_DRIVER=json` mantém o modo local e os testes existentes.

## Executar no Windows

Pré-requisito: Node.js 22 ou superior com npm.

```powershell
npm.cmd ci
npm.cmd run dev
```

Acesse http://localhost:3000. No PowerShell, use `npm.cmd` caso a política de execução bloqueie `npm.ps1`.

## Build e verificações

```powershell
npm.cmd run typecheck
npm.cmd test -- --runInBand
npm.cmd run build
npm.cmd start
npm.cmd run test:browser
node scripts/runtime-smoke.cjs
```

O teste de navegador usa o Microsoft Edge instalado, em modo headless. Testes HTTP, repositories e navegador usam diretórios temporários e não alteram os dados da aplicação.

`runtime-smoke.cjs` verifica a inicialização de desenvolvimento e build, login e permissões HTTP
em JSON temporário. Execute após o build e mantenha a porta 3219 livre.

O build limpa somente `dist/`, compila TypeScript e copia as views usando Node, sem depender de `cp` do Unix.

## Criar um administrador local

Os cinco usuários de demonstração usam a senha **123456, SOMENTE de desenvolvimento**. Professor: `carlos.silva@senac.br`; administrador: `roberto.ferreira@senac.br`. Troque as senhas antes de qualquer uso real. Para criar outra conta, faça o build e execute:

```powershell
npm.cmd run build
$senhaAdmin = Read-Host "Senha do novo administrador" -AsSecureString
$env:SENAC_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $senhaAdmin).Password
npm.cmd run admin:create -- "Seu Nome" "seu.email@exemplo.com"
Remove-Item Env:SENAC_ADMIN_PASSWORD
```

O e-mail deve ser diferente dos já cadastrados. O comando grava apenas um hash bcrypt. O cadastro web de outras contas exige um administrador autenticado. Recuperação de senha é feita pela administração, editando o cadastro; não há serviço de e-mail.

## Funcionalidades

- Login, logout por POST, opção lembrar-me e autorização por perfil.
- Professor: consulta salas, verifica disponibilidade, cria/cancela reservas e edita/cancela suas aulas.
- Aluno: consulta aulas e se inscreve/cancela inscrição em NOA com controle de vagas.
- Administrador: cadastra, edita e remove salas, usuários e grade. Registros vinculados não são excluídos.
- Perfil: dados pessoais, troca de senha e avatar JPG/PNG/WebP de até 2 MB.
- Pesquisa e detalhes exibem aulas persistidas; dashboards usam o usuário autenticado.
- Formulários só mostram sucesso após confirmação do servidor.

Reservas verificam sala ativa, data futura e conflitos de sala/professor com reservas e grade vigente. Intervalos adjacentes são permitidos. Datas escolares são interpretadas em America/Sao_Paulo.

## Configuração

| Variável | Uso |
| --- | --- |
| `PORT` | Porta HTTP; padrão 3000. |
| `DATA_DIR` | Diretório de JSON; padrão `src/data` relativo ao projeto, também no build. |
| `AVATAR_DIR` | Diretório de avatars; padrão `public/uploads/avatars`. |
| `SESSION_SECRET` | Segredo das sessões; obrigatório quando `NODE_ENV=production`. |
| `NODE_ENV` | Em produção exige HTTPS para cookies. |
| `TRUST_PROXY=1` | Usar apenas atrás de um proxy HTTPS confiável. |
| `SENAC_ADMIN_PASSWORD` | Senha temporária para o comando local de criação de administrador. |

O servidor e os scripts carregam `.env` automaticamente com dotenv; variáveis já definidas no ambiente têm prioridade. Nunca versione `.env`.

## MySQL no computador local ou Codespaces

```powershell
Copy-Item .env.example .env
# Edite .env: defina suas senhas e o segredo de sessão.
docker compose up -d
# Aguarde o serviço ficar healthy: docker compose ps
npm.cmd run build
npm.cmd run db:init
npm.cmd run db:seed
npm.cmd run dev
```

No Linux/Codespaces, use `cp .env.example .env` e `npm` no lugar de `npm.cmd`.
O Compose utiliza MySQL 8, volume persistente e aplica o schema na primeira inicialização.
`db:init` é idempotente e pode ser executado novamente. O database deve existir (o Compose cria
`DB_NAME` automaticamente); em um MySQL já instalado, peça sua criação ao administrador.
`db:seed` importa os JSON de `DATA_DIR` (padrão `src/data`) na ordem das chaves estrangeiras,
com UPSERT por id, sem duplicar nem excluir registros adicionais. Registros de demonstração
com o mesmo id são atualizados; não use o seed para preservar personalizações desses registros.
E-mails conflitantes com outro id provocam erro e rollback.

`npm.cmd run db:reset` **apaga as cinco tabelas da aplicação e recria o schema vazio**.
Execute `db:seed` depois para repopular. Não remove o volume Docker nem outras tabelas.
Os comandos preferem `dist` após o build; sem `dist`, usam ts-node. Para executar diretamente:

```powershell
node -r ts-node/register src/scripts/database.ts init
node -r ts-node/register src/scripts/database.ts seed
node dist/scripts/database.js init
node dist/scripts/database.js seed
```

| Variável | Configuração MySQL |
| --- | --- |
| `DB_DRIVER` | `json` (padrão) ou `mysql`; `.env.example` seleciona MySQL. |
| `DB_HOST` | Host obrigatório no modo MySQL. |
| `DB_PORT` | Porta, padrão 3306. |
| `DB_USER` | Usuário obrigatório com permissões no database. |
| `DB_PASSWORD` | Senha obrigatória; não é exibida nos logs. |
| `DB_NAME` | Database obrigatório e previamente criado. |
| `SEED_PASSWORD` | Opcional, mínimo 6 caracteres: substitui as senhas dos usuários importados; vazio mantém os hashes JSON. |
| `MYSQL_TEST_URL` | URL de um database dedicado aos testes; veja abaixo. |

`SESSION_SECRET` e `PORT` também estão no exemplo. Falta de configuração MySQL gera erro
explícito na inicialização. `admin:create` usa o driver selecionado e também pode ser chamado
com `node -r ts-node/register src/scripts/create-admin.ts "Nome" "email@exemplo.com"`.

Para voltar a JSON, altere `DB_DRIVER=json` no `.env` ou defina `$env:DB_DRIVER='json'` antes
de iniciar. Isso não copia alterações do MySQL de volta para os arquivos.

## Testes do banco

Os testes padrão não carregam `.env` e usam JSON quando `DB_DRIVER` não está definido.
Mappers são testados sem servidor MySQL; a suíte de integração é pulada sem `MYSQL_TEST_URL`.
Para forçar o modo JSON no PowerShell: `$env:DB_DRIVER='json'; npx.cmd jest`.

Crie previamente um database vazio dedicado, por exemplo `senacmanager_test`, com permissão
para criar tabelas. A suíte recusa nomes sem `test`, aplica o schema e **limpa as cinco tabelas
antes de cada teste e ao terminar**. Nunca aponte para dados que deseja preservar.

```powershell
# Defina a URL apenas no ambiente local; use encoding de URL na senha se necessário.
$env:MYSQL_TEST_URL='mysql://USUARIO:SENHA@127.0.0.1:3306/senacmanager_test'
npx.cmd jest src/__tests__/database --runInBand
Remove-Item Env:MYSQL_TEST_URL
```

No Linux: `MYSQL_TEST_URL='mysql://USUARIO:SENHA@127.0.0.1:3306/senacmanager_test' npx jest src/__tests__/database --runInBand`.
São cobertos round-trip das cinco coleções, substituição por UPSERT/DELETE, rollback,
concorrência pelo repository, idempotência do seed, UNIQUE de e-mail e proteção das FKs.

## Dados e limites operacionais

Os arquivos são `usuarios.json`, `salas.json`, `reservas.json`, `aulas-grade.json` e `inscricoes-noa.json`.

No modo JSON, alterações são serializadas em memória e cada arquivo é substituído atomicamente.
Execute **um único processo escritor**; essa fila não coordena múltiplas instâncias ou edição manual.
Faça backups com o servidor parado. No MySQL, `transaction` usa BEGIN/COMMIT/ROLLBACK e
AsyncLocalStorage para compartilhar a conexão. GET_LOCK por database serializa operações de
leitura/modificação/gravação entre processos da aplicação; SQL externo deve respeitar o mesmo
protocolo para participar dessa proteção. O lock é liberado explicitamente após commit/rollback.
O pool usa UTC e dateStrings; datas escolares continuam em America/Sao_Paulo. Metadados
`campos` e `ordem` preservam campos opcionais e ordem dos arrays. FKs RESTRICT impedem órfãos.

As sessões também são mantidas em memória e expiram quando o processo reinicia. Não há envio automático de e-mails ou notificações.

Os dados iniciais são exemplos históricos. As aulas do semestre 2024.1 não ocupam salas no semestre atual. Para testar NOA com inscrições, cadastre uma atividade no semestre corrente e configure vagas. As reservas de 2024 permanecem no histórico.

Correções dos exemplos: `horarioInicio/horarioFim` padronizados, alunos com curso Desenvolvimento
de Sistemas e turma DS-2024A, disciplinas dos professores como arrays e reservas com disciplina
demonstrativa. IDs e datas originais foram preservados; hashes foram substituídos pelos de desenvolvimento.

## Estrutura

- `src/models`: validação e serialização de entidades.
- `src/services`: API de persistência independente do driver e regras de negócio.
- `src/database`: drivers JSON/MySQL, pool, mappers e aplicação do schema.
- `database/schema.sql`: schema MySQL idempotente com índices e chaves estrangeiras.
- `src/repositories`: operações de acesso a entidades sobre a mesma infraestrutura de persistência.
- `src/controllers` e `src/routes`: HTTP e preparação dos dados das páginas.
- `src/views`: páginas EJS.
- `public/js/app.js`: formulários, ações, abas e filtros; `sidebar.js` controla menus.
- `src/__tests__` e `scripts/browser-test.cjs`: regressões e navegação automatizada.

Pastas locais `skills/`, `.agents/skills/`, `.codex/skills/` e `codex-personal-skills/` são ignoradas pelo Git. Skills globais em `C:\\Users\\<usuário>\\.codex\\skills` ficam fora do repositório.

Projeto acadêmico desenvolvido para uso educacional.
