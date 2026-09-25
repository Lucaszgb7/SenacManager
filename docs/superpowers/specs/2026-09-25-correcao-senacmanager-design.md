# Correção integrada do SenacManager com persistência JSON

Data: 2026-09-25
Estado: proposta para revisão do usuário; implementação ainda não iniciada.

## Objetivo e decisão aprovada

O usuário pediu a correção dos problemas identificados na revisão do projeto. Confirmou que os dados devem continuar em arquivos JSON durante esta etapa. A migração para banco de dados é uma etapa futura, posterior à correção e validação do código.

O resultado esperado é uma aplicação em que cada perfil consegue entrar, navegar e executar as operações oferecidas pela interface, com persistência real e respostas de erro compreensíveis. Uma mensagem de sucesso só aparece depois de a operação ser concluída no servidor.

## Restrições

- Manter TypeScript, Express, EJS, JavaScript e CSS existentes.
- Manter persistência em JSON; não adicionar banco, ORM ou serviço externo nesta etapa.
- Preservar a identidade visual e corrigir os defeitos de estrutura e interação.
- Preservar IDs, hashes de senha e registros existentes. Não trocar senhas nem apagar dados automaticamente.
- Executar a aplicação como um único processo escritor dos arquivos JSON. Uso com múltiplas instâncias fica fora da garantia desta etapa e deve ser documentado.
- Testes usam dados temporários isolados; nunca modificam src/data nem uploads reais.
- Windows é plataforma obrigatória para instalação, desenvolvimento e build.

## Organização da correção

Os controllers continuam sendo responsáveis pelo protocolo HTTP; os modelos, por validação e serialização; os repositories, por acesso aos JSON. Regras que envolvem mais de um registro, como disponibilidade de sala e inscrição com limite de vagas, ficam em serviços pequenos compartilhados pelos controllers.

Views recebem objetos explícitos de apresentação, contendo os nomes e propriedades usados no EJS. Não espalhar instâncias de classes para construir esses objetos. Rotas preservam o contexto dos controllers.

### 1. Dados, modelos e persistência

Padronizar os perfis em professor, aluno e administrador. O carregamento aceita o valor legado admin e normaliza sua representação. Horários usam horarioInicio e horarioFim; o carregamento aceita os nomes legados horaInicio e horaFim.

Corrigir os dados de demonstração sem perder seus identificadores ou datas históricas. Os campos obrigatórios que faltam nos exemplos recebem valores de demonstração identificados como tais, sem apresentá-los como informações escolares verificadas. O procedimento e os campos alterados ficam documentados. Dados operacionais inválidos devem gerar diagnóstico com arquivo e registro, em vez de serem silenciosamente descartados.

Todos os campos editáveis e exibidos devem sobreviver ao ciclo JSON -> modelo -> JSON: telefone, fotoUrl, disciplinas do professor, curso e turma do aluno. Campos extras de perfil só permanecem na interface/API se forem efetivamente modelados e persistidos. Preservar atributos existentes relevantes, inclusive ativa nas salas e metadados dos registros.

Centralizar o diretório de dados, com configuração DATA_DIR e valor padrão independente do diretório de execução e do build. Não copiar dados operacionais para dist nem reinicializá-los durante o build.

Serializar operações de leitura, validação e alteração que competem pelos mesmos registros. Gravar cada arquivo por meio de arquivo temporário no mesmo diretório e substituição atômica. A verificação de conflito e a inclusão de reserva fazem parte da mesma operação serializada. Inscrições, unicidade de e-mail e validação de referências também usam essa proteção. Quando possível, uma ação altera um único arquivo; exclusões que exigiriam cascata são recusadas com mensagem específica.

### 2. Autenticação, autorização e sessão

Corrigir login para consultar o repository, verificar bcrypt e estabelecer uma sessão com o perfil padronizado. Renovar o identificador da sessão no login e concluir sua gravação antes de redirecionar. Logout usa POST e destrói a sessão.

Cadastro de usuários fica disponível apenas ao administrador autenticado. Campos desconhecidos não permitem alteração de ID, perfil ou senha por rotas de edição pessoal. Endpoints administrativos validam o perfil no servidor; esconder controles não substitui autorização.

A recuperação de senha não deve fingir enviar e-mail: oferecer orientação de contato com a administração e permitir redefinição administrativa explícita. Documentar um procedimento local controlado para provisionar o primeiro administrador, sem criar senha padrão pública ou rota pública de bootstrap.

O checkbox lembrar-me controla a duração do cookie; sua ausência usa uma sessão de navegador. Manter segredo de sessão obrigatório em produção, cookies seguros e configuração explícita quando houver proxy HTTPS. Documentar que sessões em memória são perdidas ao reiniciar o processo.

Validar tipos e formatos de entradas antes de chamar modelos. Responder 400 para dados inválidos, 401 para ausência de autenticação, 403 para falta de autorização, 404 para recurso inexistente e 409 para conflitos. Falhas inesperadas retornam 500 genérico, com diagnóstico interno.

### 3. Salas e reservas

Salas disponíveis mostram dados reais, estado de atividade e ocupação atual. Considerar reservas confirmadas e aulas da grade vigentes. Sala inativa não pode receber nova reserva.

O formulário envia salaId, data, horarioInicio, horarioFim, disciplina e turma. Exibir disponibilidade para o intervalo escolhido e confirmar novamente no servidor antes de salvar. Recusar sala inexistente/inativa, datas ou horários inválidos, início passado, fim menor ou igual ao início e sobreposição com reserva ou aula regular vigente. Intervalos adjacentes são permitidos.

Preservar o caráter histórico das aulas com semestre informado: determinar a vigência a partir do semestre, evitando que uma grade de 2024 bloqueie reservas em 2026. Registros novos de grade devem ter vigência explícita e válida. Datas e horários escolares usam America/Sao_Paulo de forma consistente no cálculo e na exibição.

Minhas Reservas mostra apenas os registros do professor autenticado, resolve nomes de sala e exibe intervalo completo. As abas funcionam; registros cancelados são identificados e não oferecem novo cancelamento. O cancelamento valida proprietário e ocorrência encerrada, persiste o status e atualiza a tela depois da confirmação do servidor.

Mensagens do formulário preservam os valores preenchidos e não dependem de variáveis EJS ausentes. Remover a promessa de e-mail automático enquanto não existir integração de envio.

### 4. Perfil e avatar

Renderizar o usuário real e carregar os campos específicos do perfil. Atualização de dados e troca de senha chamam as rotas reais. Aplicar a mesma regra de senha no navegador e no servidor: mínimo de oito caracteres; troca pessoal exige senha atual e confirmação coerente.

Disponibilizar upload real de avatar com limite de 2 MB. Aceitar JPEG, PNG e WebP somente quando assinatura do conteúdo e formato permitido forem coerentes. Gerar nome e extensão no servidor; não usar a extensão do nome enviado. Nenhum HTML/SVG ou outro formato ativo deve ser publicado como avatar.

Somente remover a foto anterior após persistir a referência à nova. Falhas limpam o novo arquivo órfão sem excluir a foto ainda referenciada. Os caminhos de exclusão ficam restritos ao diretório de avatars. Edição de outro campo não apaga telefone ou foto.

### 5. Dashboards, pesquisa e aulas

Dashboards usam a identidade da sessão e dados dos repositories. Professor vê suas aulas e reservas; aluno vê sua turma e inscrições; administrador vê contagens reais. Remover duplicação do dashboard do professor e apresentar estados vazios quando não houver registros aplicáveis.

Pesquisa usa aulas reais e filtros existentes. Cada resultado aponta para seu ID. Detalhes buscam o registro correto, resolvem professor e sala e retornam 404 para ID inexistente.

Administrador pode cadastrar e editar a grade. Professor pode editar ou cancelar somente suas aulas; alterações passam pela mesma verificação de horários e disponibilidade. Cancelamento marca o registro inativo e preserva histórico. Remoção definitiva administrativa só é permitida quando não houver referências dependentes; caso contrário retornar 409. Remover promessas de notificação automática inexistente.

### 6. Administração

Conectar listagens, formulários e ações existentes a endpoints administrativos reais para salas, usuários e grade. Ações são confirmadas na interface apenas depois de persistidas.

Validar e-mail único normalizado, capacidade positiva, referências de professor/sala, perfil permitido e campos obrigatórios de cada tipo de usuário. Impedir autoexclusão administrativa e remoção do último administrador. Mudanças de perfil seguem uma ação administrativa validada, preservando a integridade dos campos específicos.

Excluir recursos com referências existentes retorna 409; oferecer desativação onde o modelo suportar, em vez de apagar relações em cascata. Usuário desativado não consegue entrar nem continuar usando sessão antiga. Não devolver hashes de senha em respostas ou HTML.

### 7. NOA

Atividades NOA vêm da grade e possuem capacidade válida, limitada pela sala. Persistir inscrições em inscricoes-noa.json com identificação de aluno e atividade. Inscrever-se exige perfil aluno, atividade vigente/ativa, ausência de inscrição duplicada e vaga disponível. A checagem de vagas e a inclusão são serializadas.

Minhas inscrições mostra os registros reais. Permitir cancelamento da própria inscrição e atualizar a contagem de vagas. Atividade sem vagas exibe estado esgotado e o servidor também impede novas inscrições.

### 8. Layout, navegação e erros

Unificar o carregamento dos estilos e scripts necessários ao cabeçalho e menu. Toda página tem estrutura HTML válida, um único cabeçalho e IDs únicos. Corrigir abertura do menu móvel, dropdown do usuário e indicação da página atual.

Garantir que hidden seja respeitado pelos componentes com display próprio. Corrigir seletores de abas e botões para corresponderem ao HTML. Preservar navegação por teclado e rótulos dos formulários.

Cada link visível deve apontar para uma rota implementada. Remover controles redundantes ou apresentar instrução explícita quando a integração externa não fizer parte desta etapa. Implementar views de erro e encaminhar falhas após envio de headers ao mecanismo correto do Express.

### 9. Build, configuração e documentação

Substituir cp por uma rotina Node multiplataforma de cópia das views. Verificar desenvolvimento e execução do artefato compilado. Ler PORT da configuração com padrão 3000.

Atualizar README para refletir autenticação, persistência JSON, variáveis de ambiente, provisionamento inicial, funcionalidades implementadas e limitações operacionais. A documentação não deve afirmar que as ações ainda são simuladas após sua integração.

## Critérios de aceitação e validação

1. TypeScript e build terminam sem erros no Windows.
2. Os 27 testes existentes continuam passando, com ajustes somente se refletirem a padronização deliberada do contrato.
3. Testes reproduzem os bugs de contexto dos controllers, dados iniciais incompatíveis, variáveis EJS ausentes e perda de campos no perfil antes das correções.
4. Testes HTTP cobrem login válido/inválido, logout, autorização por perfil e renderização de todas as páginas.
5. Reservar, listar e cancelar persiste dados; duas requisições concorrentes conflitantes não produzem duas reservas confirmadas nem perdem registros.
6. Conflitos com grade vigente, intervalos adjacentes, sala inativa, datas passadas e autorização do proprietário têm testes específicos.
7. Alterar perfil, trocar senha e enviar avatar válido funcionam; upload disfarçado, arquivo grande e alteração não autorizada são rejeitados.
8. Administração persiste operações e preserva referências; todas as mutações são inacessíveis a alunos e professores sem permissão.
9. Pesquisa/detalhes usam o ID correto. NOA impede duplicidade e excesso de vagas inclusive com requisições concorrentes.
10. Testes de interface ou verificação no navegador exercitam formulários, abas, menus e ausência de mensagens falsas de sucesso. Limitações de ferramentas devem ser registradas, sem apresentar checagens estáticas como testes visuais.
11. Execução compilada usa os mesmos dados configurados e não depende dos arquivos TypeScript.
12. Relatório final relaciona correções, testes executados e limitações restantes. Migração para banco não faz parte da entrega desta etapa.

## Sequência prevista

Primeiro reparar modelos, dados e infraestrutura de persistência; depois autenticação e autorização; em seguida reservas e perfil; depois integrar grade, administração e NOA; por fim revisar interface, build e documentação. Cada conjunto recebe testes de regressão e verificação de integração. O plano de implementação detalhado será preparado após a revisão desta especificação.

## Revisão da especificação

A proposta mantém a decisão do usuário sobre JSON, contempla os problemas identificados na análise e define comportamento para os fluxos que antes eram simulações. As dependências entre operações foram explicitadas: mesma regra de ocupação para grade e reservas, validação de referências para exclusões, serialização de alterações e isolamento dos dados de teste. A migração futura para banco permanece separada.
