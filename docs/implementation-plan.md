# Persistência MySQL do SenacManager

Especificação: requisitos A1–A4 e B1–B7 fornecidos em 20/10/2026.
Execução na sessão atual, preservando MVC, APIs do SchoolService e JSON padrão.

- [x] Ler código e reproduzir falhas; corrigir sessão, autorização e seed; validar os 43 testes.
- [x] Extrair JSON, selecionar driver, adaptar repositories e implementar mappers, pool e transações.
- [x] Criar schema com FKs RESTRICT, scripts de inicialização/seed/reset e Compose.
- [x] Cobrir mappers sem banco e integração condicional em banco dedicado.
- [x] Documentar configuração, verificar TypeScript, Jest, build e servidores.
- [x] Registrar verificações MySQL que o ambiente não permitir executar.

MySQL serializa transações de leitura/modificação/gravação com GET_LOCK por banco e
AsyncLocalStorage por conexão. writeData substitui a coleção atomicamente; seed usa UPSERT
sem remover dados adicionais. Campos opcionais e ordem dos arrays são preservados por metadados.
Sessões permanecem em memória (B5 é opcional).
