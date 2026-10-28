# Verificação no ambiente Linux — 28/10/2026

O `git pull --ff-only origin main` confirmou que o checkout estava atualizado.

## Correções

- Restauradas do histórico as funções removidas de SchoolService que impediam o build e a execução de perfil, grade, NOA e administração.
- Reservas e cancelamentos usam o serviço transacional, com validação de datas, sala ativa, professor e conflitos com a grade.
- Listagem de reservas fornece os campos esperados pela view e separa cancelamentos no histórico, considerando America/Sao_Paulo.
- Perfil voltou a usar os campos, endpoints e formulários AJAX do backend, com feedback e validação nativa.
- Formulário de reserva usa AJAX e mantém cartões, lista e sala informada na URL sincronizados.
- Professor aceita registros legados sem perfil explícito; mensagens de perfil têm acentuação corrigida.
- Datas inexistentes são rejeitadas e o dia atual segue o fuso escolar.
- Servidor respeita PORT=8080, falha diante de configuração MySQL incompleta e só confia em proxy com TRUST_PROXY=1.
- Smoke de desenvolvimento usa tsx, conforme npm run dev; teste de navegador aceita Chromium do sistema.

## Resultados

Node.js 24.19.0, npm 11.9.0; dependências instaladas com npm ci, sem alterar lockfiles.

- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm test -- --runInBand`: 11 suítes passaram; 65 testes passaram; 1 suíte/12 testes MySQL pulados.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node scripts/browser-test.cjs`: passou. Exercitou login, seleção de sala por URL/cartão/lista, reserva, cancelamento, erros/retry, perfil/senha, abas, menu mobile, logout e cadastro administrativo.
- `node scripts/runtime-smoke.cjs`: passou, com desenvolvimento e build, login real, páginas e autorização de administrador.
- Servidor compilado em PORT=8080: GET /login retornou 200.
- Inicialização MySQL sem DB_HOST/DB_USER/DB_PASSWORD/DB_NAME: encerrou com erro explícito.
- Servidor iniciado com instruções salvas: GET /login 200, autenticação 302 e dashboard autenticado 200.
- `git diff --check`: passou.

Testes HTTP e navegador usam diretórios temporários. Dados de desenvolvimento ficam em
`/workspace/.senacmanager`; os JSON versionados não foram modificados.

## Limites

Integração com servidor MySQL não executada: não há MYSQL_TEST_URL configurada.
O modo preparado é JSON. Avisos de dependências obsoletas emitidos por npm ci não foram
tratados como falhas de compilação; não houve atualização de dependências nesta correção.
As instruções de instalação e inicialização foram salvas no rascunho do ambiente.
Publicação e restauração em uma nova tarefa dependem da ação do usuário no produto e não
foram verificadas nesta execução.
