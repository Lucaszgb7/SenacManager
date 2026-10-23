# Feedback e interações do SenacManager

## Objetivo

Deixar claro para quem usa o SenacManager quando formulários e ações foram concluídos ou falharam, mantendo o backend e o comportamento funcional existente.

## Escopo e restrições

- Reutilizar os fluxos `data-api-form`, `data-api-action` e `data-feedback` já presentes em `public/js/app.js` e nas views.
- Padronizar visualmente mensagens de sucesso e erro com as classes existentes em `public/css/components.css`, usando `public/css/functional.css` apenas para regras funcionais/responsivas necessárias.
- Sinalizar carregamento durante envios e ações e impedir solicitações duplicadas enquanto uma está em andamento.
- Restaurar o texto, estado habilitado e estado acessível do botão mesmo quando a requisição falhar.
- Preservar confirmações existentes em `data-confirm` para ações importantes.
- Não alterar backend, rotas, dependências nem funcionalidades não relacionadas.
- Incluir comentários no JavaScript explicando o controle de envio e a restauração do estado.

## Comportamento

1. Ao enviar um formulário válido, o sistema marca a região como ocupada e altera temporariamente o botão de envio para um estado de processamento. A validação existente ocorre antes do estado de carregamento.
2. Um envio em andamento bloqueia novas submissões do mesmo formulário.
3. Ao receber sucesso, o sistema apresenta a mensagem de sucesso e preserva o reset/redirect já definido pelo formulário.
4. Se a resposta falhar, a mensagem de erro recebe semântica de alerta acessível e o botão retorna ao rótulo e estado anteriores, permitindo nova tentativa.
5. Ações por `data-api-action` preservam a confirmação existente, mostram processamento enquanto aguardam e reabilitam o botão se falharem. Sucesso mantém o redirect ou reload atual.
6. Mensagens existentes e mensagens criadas pelo JavaScript usam apresentação coerente, legível em telas estreitas e com foco visível sem exigir interação por mouse.

## Acessibilidade e responsividade

- Sucesso usa anúncio de status não assertivo; erro usa anúncio assertivo (`role="alert"` ou equivalente) sem alterar indevidamente a hierarquia visual.
- Estado de processamento deve ser anunciado por texto acessível e estado `aria-busy` quando aplicável; não depender apenas de animação ou cor.
- Botões desabilitados durante envio mantêm contraste legível e voltam ao estado original após erro.
- Avisos podem quebrar linha e ocupar a largura disponível em telas estreitas; respeitar preferência por movimento reduzido caso haja animação.

## Validação

- Executar verificações existentes apropriadas e o fluxo de navegador configurado no projeto.
- Cobrir formulário com sucesso, falha HTTP/fetch e nova tentativa; confirmar que não há envio duplicado e que o botão recupera seu estado.
- Cobrir uma ação confirmável com cancelamento, falha e sucesso.
- Inspecionar mensagens e operação por teclado em viewport desktop e estreita, sem usar/resetar dados reais.

## Decisões de implementação pendentes de plano

- O feedback deve definir semântica de status/erro centralmente no helper `feedback`, tanto para elementos já presentes na view quanto para elementos criados dinamicamente.
- O estado de carregamento deve preservar/restaurar texto e atributos originais do botão em um bloco de finalização confiável.
- A confirmação nativa atual é preservada; não será criado diálogo novo.
