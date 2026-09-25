# SenacManager

Aplicação escolar em TypeScript, Express e EJS, com persistência em arquivos JSON. Não requer banco de dados.

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
```

O teste de navegador usa o Microsoft Edge instalado, em modo headless. Testes HTTP, repositories e navegador usam diretórios temporários e não alteram os dados da aplicação.

O build limpa somente `dist/`, compila TypeScript e copia as views usando Node, sem depender de `cp` do Unix.

## Criar um administrador local

Os registros de demonstração mantêm os hashes originais. Nenhuma senha padrão foi introduzida. Para criar uma conta com senha conhecida, faça o build e execute:

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

Variáveis devem ser definidas no ambiente do processo. Arquivos `.env` não são carregados automaticamente.

## Dados e limites operacionais

Os arquivos são `usuarios.json`, `salas.json`, `reservas.json`, `aulas-grade.json` e `inscricoes-noa.json`.

As alterações são serializadas e cada arquivo é substituído atomicamente. Execute **um único processo escritor**: o bloqueio é em memória e não coordena múltiplas instâncias, edição manual concorrente ou gravações de outros programas. Faça backups com o servidor parado. A migração para banco de dados fica para uma etapa posterior.

As sessões também são mantidas em memória e expiram quando o processo reinicia. Não há envio automático de e-mails ou notificações.

Os dados iniciais são exemplos históricos. As aulas do semestre 2024.1 não ocupam salas no semestre atual. Para testar NOA com inscrições, cadastre uma atividade no semestre corrente e configure vagas. As reservas de 2024 permanecem no histórico.

Correções dos exemplos: padronização de `horarioInicio/horarioFim`; alunos e aulas sem turma receberam `TURMA DEMONSTRACAO`; reservas sem disciplina receberam `Atividade de demonstracao`. Esses valores são demonstrativos, não informações escolares verificadas. IDs, hashes e datas originais foram preservados.

## Estrutura

- `src/models`: validação e serialização de entidades.
- `src/services`: persistência JSON, transações no processo e regras de negócio.
- `src/repositories`: operações de acesso a entidades sobre a mesma infraestrutura de persistência.
- `src/controllers` e `src/routes`: HTTP e preparação dos dados das páginas.
- `src/views`: páginas EJS.
- `public/js/app.js`: formulários, ações, abas e filtros; `sidebar.js` controla menus.
- `src/__tests__` e `scripts/browser-test.cjs`: regressões e navegação automatizada.

Pastas locais `skills/`, `.agents/skills/`, `.codex/skills/` e `codex-personal-skills/` são ignoradas pelo Git. Skills globais em `C:\\Users\\<usuário>\\.codex\\skills` ficam fora do repositório.

Projeto acadêmico desenvolvido para uso educacional.
