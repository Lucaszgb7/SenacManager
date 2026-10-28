// Importa o Router do Express para criar e organizar as rotas da aplicação.
import { Router } from 'express';

// Importa o middleware que verifica se o usuário está autenticado.
import { autenticado } from '../middlewares/authMiddleware';

// Importa o middleware que restringe o acesso conforme o perfil do usuário.
import { permitirPerfis } from '../middlewares/perfilMiddleware';

// Importa os serviços responsáveis pelas operações relacionadas à escola.
import {
  state, // Recupera o estado atual dos dados da aplicação.
  classView, // Prepara os dados de uma aula para serem exibidos nas páginas.
  enroll, // Realiza ou cancela a inscrição de um aluno em uma atividade NOA.
  saveRoom, // Cria ou atualiza os dados de uma sala.
  saveClass, // Cria ou atualiza os dados de uma aula.
  saveUser, // Cria ou atualiza os dados de um usuário.
  removeRecord, // Remove um registro do sistema.
  cancelClass, // Cancela uma aula.
  safeUser, // Prepara os dados públicos de um usuário, evitando expor campos sensíveis.
  atualizarStatusUsuario, // Atualiza o status de um usuário; importado, mas não utilizado neste arquivo.
  buscarAulaPorId, // Busca uma aula pelo identificador.
  cancelBooking, // Cancela uma reserva de sala.
  listarAtividadesNoa, // Lista as atividades NOA cadastradas.
  listarInscricoesNoaAluno, // Lista as inscrições NOA de um aluno.
} from '../services/SchoolService';

// Importa funções de data, validação, tratamento de erros e conversão de valores.
import {
  schoolNow, // Obtém a data e a hora atuais no contexto da escola.
  vigente, // Verifica se uma aula está vigente em determinada data.
  semesterRange, // Calcula ou fornece o intervalo de um semestre; importado, mas não utilizado aqui.
  HttpError, // Representa erros HTTP com códigos de status específicos.
  flag, // Auxilia no tratamento de valores de sinalização; importado, mas não utilizado aqui.
} from '../services/validation';

// ---------------------------------------------------------------------
// Configuração geral das rotas
// ---------------------------------------------------------------------

// Cria um Router para agrupar as rotas relacionadas à escola.
const router = Router();

// Aplica o middleware de autenticação a todas as rotas registradas neste Router.
// As rotas abaixo exigem autenticação, salvo particularidades da configuração externa.
router.use(autenticado);

// ---------------------------------------------------------------------
// Dashboard — painel inicial
// ---------------------------------------------------------------------

// Registra uma rota GET para exibir o painel inicial do usuário.
router.get('/dashboard', async (req, res) => {
  // Recupera os dados da aplicação e o usuário disponibilizado pelo middleware.
  const s = await state(), user = res.locals.usuario;

  // Obtém a data atual e mantém somente a parte correspondente a ano, mês e dia.
  const today = schoolNow().slice(0, 10);

  // Seleciona as aulas ativas que o usuário tem permissão para visualizar.
  const aulas = s.aulas
    .filter(a =>
      // Exclui aulas explicitamente marcadas como inativas.
      a.ativa !== false &&
      (
        // O administrador pode visualizar todas as aulas ativas.
        user.perfil === 'administrador' ||

        // O professor pode visualizar as aulas associadas ao seu identificador.
        a.professorId === user.id ||

        // O aluno pode visualizar aulas da própria turma ou nas quais está inscrito.
        (user.perfil === 'aluno' && (
          a.turma === user.turma ||
          s.inscricoes.some(i => i.aulaId === a.id && i.alunoId === user.id)
        ))
      )
    )
    // Mantém somente as aulas vigentes na data atual.
    .filter(a => vigente(a, today))
    // Converte cada aula para o formato preparado para exibição.
    .map(a => classView(a, s));

  // ---------------------------------------------------------------------
  // Métricas gerais do dashboard
  // ---------------------------------------------------------------------

  // Calcula indicadores utilizados no painel.
  const metricas = {
    // Conta a quantidade total de salas cadastradas.
    salas: s.salas.length,

    // Conta os professores que estão ativos.
    professores: s.usuarios.filter(u => u.perfil === 'professor' && u.ativo).length,

    // Conta os alunos que estão ativos.
    alunos: s.usuarios.filter(u => u.perfil === 'aluno' && u.ativo).length,

    // Conta as reservas confirmadas cujo horário de término ainda não passou.
    reservas: s.reservas.filter(
      r => r.status === 'confirmada' &&
      r.data + 'T' + r.horarioFim > schoolNow()
    ).length
  };

  // ---------------------------------------------------------------------
  // Quantidade de salas por prédio
  // ---------------------------------------------------------------------

  // Cria um objeto que armazenará a quantidade de salas de cada prédio.
  const salasPorPredio: Record<string, number> = {};

  // Percorre todas as salas cadastradas.
  s.salas.forEach(sala => {
    // Utiliza o nome do prédio ou um nome padrão quando não estiver informado.
    const p = sala.predio || 'Bloco Principal';

    // Incrementa a quantidade de salas associadas ao prédio.
    salasPorPredio[p] = (salasPorPredio[p] || 0) + 1;
  });

  // ---------------------------------------------------------------------
  // Quantidade de aulas por dia da semana
  // ---------------------------------------------------------------------

  // Inicializa os contadores de aulas para cada dia da semana.
  const aulasPorDia: Record<string, number> = {
    'Segunda': 0, 'Terça': 0, 'Quarta': 0,
    'Quinta': 0, 'Sexta': 0, 'Sábado': 0
  };

  // Converte os identificadores internos dos dias para nomes exibidos no painel.
  const mapDia: Record<string, string> = {
    'segunda': 'Segunda',
    'terca': 'Terça',
    'quarta': 'Quarta',
    'quinta': 'Quinta',
    'sexta': 'Sexta',
    'sabado': 'Sábado'
  };

  // Percorre somente as aulas que não estão marcadas como inativas.
  s.aulas.filter(a => a.ativa !== false).forEach(a => {
    // Obtém o nome de exibição correspondente ao dia da aula.
    const d = mapDia[a.diaSemana];

    // Incrementa o contador somente se o dia estiver mapeado.
    if (d && aulasPorDia[d] !== undefined) aulasPorDia[d]++;
  });

  // ---------------------------------------------------------------------
  // Próximas reservas
  // ---------------------------------------------------------------------

  // Seleciona as reservas confirmadas que o usuário pode visualizar.
  const proximasReservas = s.reservas
    .filter(r =>
      r.status === 'confirmada' &&
      (user.perfil === 'administrador' || r.professorId === user.id)
    )
    // Mantém os cinco primeiros registros da lista atual.
    .slice(0, 5)
    // Acrescenta informações da sala e do professor a cada reserva.
    .map(r => {
      // Procura a sala associada à reserva.
      const sala = s.salas.find(sal => sal.id === r.salaId);

      // Procura o professor responsável pela reserva.
      const prof = s.usuarios.find(u => u.id === r.professorId);

      // Retorna os dados da reserva junto com informações complementares.
      return {
        ...r, // Preserva todos os campos originais da reserva.
        salaNome: sala ? sala.nome : 'Sala', // Usa o nome da sala ou um valor padrão.
        predio: sala ? sala.predio : '', // Usa o prédio da sala ou uma string vazia.
        professorNome: prof ? prof.nome : 'Professor' // Usa o nome do professor ou um padrão.
      };
    });

  // ---------------------------------------------------------------------
  // Inscrições NOA do aluno
  // ---------------------------------------------------------------------

  // Prepara a lista de inscrições somente quando o usuário é aluno.
  const inscricoesNoa = user.perfil === 'aluno'
    ? s.inscricoes
        // Mantém as inscrições pertencentes ao aluno autenticado.
        .filter(i => i.alunoId === user.id)
        // Procura a aula correspondente a cada inscrição.
        .map(i => {
          const aula = s.aulas.find(a => a.id === i.aulaId);

          // Converte a aula para o formato de exibição ou retorna null se não existir.
          return aula ? classView(aula, s) : null;
        })
        // Remove os resultados nulos das aulas que não foram encontradas.
        .filter(Boolean)
    // Para outros perfis, retorna uma lista vazia.
    : [];

  // Conta as salas que não estão marcadas como inativas.
  const totalSalasAtivas = s.salas.filter(sal => sal.ativa !== false).length;

  // Conta as salas explicitamente marcadas como inativas.
  const totalSalasInativas = s.salas.filter(sal => sal.ativa === false).length;

  // Conta as atividades NOA ativas.
  const totalAtividadesNoa = s.aulas.filter(
    a => a.isNoa && a.ativa !== false
  ).length;

  // Renderiza o template do dashboard e disponibiliza os dados calculados.
  res.render('dashboard/dashboard', {
    aulas, // Aulas que o usuário pode visualizar.
    metricas, // Indicadores gerais do sistema.
    salasPorPredio, // Quantidade de salas agrupadas por prédio.
    aulasPorDia, // Quantidade de aulas por dia da semana.
    proximasReservas, // Reservas selecionadas para exibição.
    inscricoesNoa, // Inscrições NOA do aluno, quando aplicável.
    totalSalasAtivas, // Total de salas ativas.
    totalSalasInativas, // Total de salas inativas.
    totalAtividadesNoa // Total de atividades NOA ativas.
  });
});

// ---------------------------------------------------------------------
// Pesquisa de aulas com filtros combináveis
// ---------------------------------------------------------------------

// Registra uma rota GET para pesquisar aulas.
router.get('/search', async (req, res) => {
  // Recupera o estado atual da aplicação.
  const s = await state();

  // Obtém o usuário autenticado disponibilizado pelo middleware.
  const user = res.locals.usuario;

  // Normaliza o texto de pesquisa, aceitando somente valores do tipo string.
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  // Lê o filtro de disciplina e remove espaços externos.
  const disciplina = typeof req.query.disciplina === 'string'
    ? req.query.disciplina.trim()
    : '';

  // Lê o filtro de professor e remove espaços externos.
  const professor = typeof req.query.professor === 'string'
    ? req.query.professor.trim()
    : '';

  // Lê o filtro de turma e remove espaços externos.
  const turma = typeof req.query.turma === 'string'
    ? req.query.turma.trim()
    : '';

  // Lê o filtro de dia da semana e remove espaços externos.
  const diaSemana = typeof req.query.diaSemana === 'string'
    ? req.query.diaSemana.trim()
    : '';

  // Cria uma função para comparar textos sem diferenciar maiúsculas e minúsculas.
  const lower = (v: string) => v.toLocaleLowerCase('pt-BR');

  // ---------------------------------------------------------------------
  // Controle de visibilidade das aulas
  // ---------------------------------------------------------------------

  // Seleciona somente aulas ativas que o usuário pode visualizar.
  const aulasVisiveis = s.aulas
    // Exclui aulas explicitamente marcadas como inativas.
    .filter(a => a.ativa !== false)
    // Aplica as regras de visibilidade conforme o perfil do usuário.
    .filter(a =>
      // Administradores podem visualizar todas as aulas.
      user.perfil === 'administrador' ||

      // Professores podem visualizar as aulas associadas a eles.
      a.professorId === user.id ||

      // Alunos podem visualizar aulas da própria turma ou em que estão inscritos.
      (user.perfil === 'aluno' && (
        a.turma === user.turma ||
        s.inscricoes.some(i => i.aulaId === a.id && i.alunoId === user.id)
      ))
    );

  // ---------------------------------------------------------------------
  // Aplicação dos filtros da pesquisa
  // ---------------------------------------------------------------------

  // Converte as aulas visíveis para o formato utilizado na interface.
  const aulas = aulasVisiveis
    .map(a => classView(a, s))
    // Aplica os filtros informados pelo usuário.
    .filter(a => {
      // Executa a pesquisa livre quando o parâmetro q foi informado.
      if (q) {
        // Junta os campos pesquisáveis em uma única string.
        const blob = [
          a.disciplina,
          a.professor.nome,
          a.sala,
          a.turma,
          a.diaSemana,
          a.semestre
        ]
          .join(' ')
          // Padroniza o texto para uma comparação sem distinção de caixa.
          .toLocaleLowerCase('pt-BR');

        // Exclui a aula quando nenhum dos campos contém o texto pesquisado.
        if (!blob.includes(lower(q))) return false;
      }

      // Aplica o filtro parcial de disciplina, ignorando maiúsculas e minúsculas.
      if (disciplina && !lower(a.disciplina).includes(lower(disciplina))) return false;

      // Aplica o filtro parcial pelo nome do professor.
      if (professor && !lower(a.professor.nome).includes(lower(professor))) return false;

      // Aplica o filtro exato de turma.
      if (turma && a.turma !== turma) return false;

      // Aplica o filtro exato de dia da semana.
      if (diaSemana && a.diaSemana !== diaSemana) return false;

      // Mantém a aula quando todos os filtros preenchidos forem satisfeitos.
      return true;
    });

  // ---------------------------------------------------------------------
  // Opções de professores para o formulário de pesquisa
  // ---------------------------------------------------------------------

  // Obtém os nomes dos professores associados às aulas visíveis.
  const professores = Array.from(
    new Set(
      aulasVisiveis
        .map(a => {
          // Procura o registro do professor responsável pela aula.
          const p = s.usuarios.find(u => u.id === a.professorId);

          // Retorna o nome encontrado ou null quando o professor não existir.
          return p ? p.nome : null;
        })
        // Remove os valores nulos e garante que os itens restantes sejam strings.
        .filter((v): v is string => Boolean(v))
    )
  )
    // Ordena os nomes alfabeticamente conforme a configuração brasileira.
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  // ---------------------------------------------------------------------
  // Opções de turmas para o formulário de pesquisa
  // ---------------------------------------------------------------------

  // Obtém as turmas existentes nas aulas que o usuário pode visualizar.
  const turmas = Array.from(
    new Set(aulasVisiveis.map(a => a.turma).filter(Boolean))
  )
    // Ordena as turmas alfabeticamente.
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  // ---------------------------------------------------------------------
  // Opções de dias da semana
  // ---------------------------------------------------------------------

  // Define os valores internos e os rótulos exibidos no formulário.
  const diasSemana = [
    { valor: 'segunda', rotulo: 'Segunda-feira' },
    { valor: 'terca', rotulo: 'Terça-feira' },
    { valor: 'quarta', rotulo: 'Quarta-feira' },
    { valor: 'quinta', rotulo: 'Quinta-feira' },
    { valor: 'sexta', rotulo: 'Sexta-feira' },
    { valor: 'sabado', rotulo: 'Sábado' },
  ];

  // Verifica se pelo menos um filtro foi preenchido.
  const temFiltro = Boolean(q || disciplina || professor || turma || diaSemana);

  // Renderiza a página de pesquisa com os resultados e as opções dos filtros.
  res.render('search/search-filters', {
    aulas, // Aulas encontradas após a aplicação dos filtros.
    busca: q, // Mantém compatibilidade com o nome usado pelo template existente.
    filtros: { q, disciplina, professor, turma, diaSemana }, // Preserva os filtros preenchidos.
    professores, // Lista de professores disponível para seleção.
    turmas, // Lista de turmas disponível para seleção.
    diasSemana, // Lista de dias da semana disponível para seleção.
    temFiltro, // Informa se existe algum filtro aplicado.
    semResultados: temFiltro && aulas.length === 0, // Indica se a pesquisa não encontrou resultados.
  });
});

// ---------------------------------------------------------------------
// Redirecionamento para a pesquisa de aulas
// ---------------------------------------------------------------------

// Registra a rota GET /classes.
router.get('/classes', (_req, res) => {
  // Redireciona o usuário para a página de pesquisa de aulas.
  res.redirect('/search');
});

// ---------------------------------------------------------------------
// Detalhes de uma aula usando query string
// ---------------------------------------------------------------------

// Registra uma rota GET para consultar os detalhes de uma aula.
router.get('/classes/details', async (req, res) => {
  // Recupera os dados da aplicação e extrai o ID informado na query string.
  const s = await state(), id = String(req.query.id || '');

  // Procura a aula cujo identificador corresponde ao informado.
  const aula = s.aulas.find(a => a.id === id);

  // Retorna um erro HTTP 404 caso a aula não seja encontrada.
  if (!aula) throw new HttpError(404, 'Aula não encontrada.');

  // Renderiza a página de detalhes utilizando os dados preparados da aula.
  res.render('classes/class-details', { aula: classView(aula, s) });
});

// ---------------------------------------------------------------------
// Detalhes de uma aula usando parâmetro de rota
// ---------------------------------------------------------------------

// Registra uma rota GET para consultar uma aula pelo ID presente na URL.
router.get('/classes/:id', autenticado, async (req, res) => {
  // Busca a aula pelo identificador recebido na rota.
  const aula = await buscarAulaPorId(String(req.params.id));

  // Renderiza a página de detalhes e disponibiliza o usuário autenticado.
  res.render('classes/class-details', {
    aula,
    usuario: res.locals.usuario
  });
});

// ---------------------------------------------------------------------
// Página de edição de uma aula
// ---------------------------------------------------------------------

// Permite que professores e administradores acessem a página de edição.
router.get(
  '/classes/:id/edit',
  permitirPerfis('professor', 'administrador'),
  async (req, res) => {
    // Recupera o estado e procura a aula pelo identificador informado.
    const s = await state(), aula = s.aulas.find(a => a.id === req.params.id);

    // Retorna 404 se a aula não existir.
    if (!aula) throw new HttpError(404, 'Aula não encontrada.');

    // Impede que um professor edite uma aula pertencente a outro professor.
    if (
      res.locals.usuario.perfil !== 'administrador' &&
      aula.professorId !== res.locals.usuario.id
    ) {
      // Retorna HTTP 403 quando o professor não tem autorização para editar.
      throw new HttpError(403, 'Esta aula pertence a outro professor.');
    }

    // Renderiza o formulário de edição com os dados necessários.
    res.render('admin/edit', {
      kind: 'aulas-grade', // Identifica o tipo de registro que será editado.
      record: aula, // Fornece os dados atuais da aula.
      salas: s.salas, // Disponibiliza as salas cadastradas.
      professores: s.usuarios.filter(u => u.perfil === 'professor'), // Lista os professores.
      endpoint: '/classes/' + aula.id, // Define o caminho usado para enviar a atualização.
      back: '/classes/details?id=' + aula.id // Define o caminho de retorno aos detalhes.
    });
  }
);

// ---------------------------------------------------------------------
// Atualização de uma aula
// ---------------------------------------------------------------------

// Registra uma rota PUT para atualizar uma aula existente.
router.put(
  '/classes/:id',
  permitirPerfis('professor', 'administrador'),
  async (req, res) => {
    // Atualiza a aula usando os dados enviados e o usuário autenticado.
    await saveClass(req.body || {}, res.locals.usuario, String(req.params.id));

    // Retorna uma resposta JSON indicando que a atualização foi concluída.
    res.json({ success: true, message: 'Aula atualizada.' });
  }
);

// ---------------------------------------------------------------------
// Cancelamento de uma aula ou reserva
// ---------------------------------------------------------------------

// Registra uma rota POST para solicitar o cancelamento de uma aula ou reserva.
router.post(
  '/classes/:id/cancelar',
  autenticado, // Exige autenticação.
  permitirPerfis('professor', 'administrador'), // Restringe o acesso aos perfis permitidos.
  async (req, res) => {
    // Recupera os dados do usuário autenticado.
    const usuario = res.locals.usuario;

    // Busca a aula ou reserva pelo identificador recebido na URL.
    const aula = await buscarAulaPorId(String(req.params.id));

    // Verifica se o registro corresponde a uma reserva.
    if (aula.tipo === 'reserva') {
      // Para administradores, utiliza o ID do professor dono da reserva.
      // Para professores, utiliza o ID do próprio usuário autenticado.
      const actorId = usuario.perfil === 'administrador'
        ? aula.professorId
        : usuario.id;

      // Solicita o cancelamento da reserva usando o identificador escolhido.
      await cancelBooking(actorId, aula.id);

      // Retorna uma resposta JSON informando que a reserva foi cancelada.
      res.json({ success: true, message: 'Reserva cancelada.' });

      // Interrompe a execução para não tentar cancelar também uma aula.
      return;
    }

    // Cancela uma aula regular usando o usuário autenticado.
    await cancelClass(aula.id, usuario);

    // Retorna uma resposta JSON indicando o cancelamento da aula.
    res.json({ success: true, message: 'Aula cancelada.' });
  }
);

// ---------------------------------------------------------------------
// NOA — Novas Oportunidades de Aprendizagem
// ---------------------------------------------------------------------

// Registra uma rota GET para visualizar atividades NOA.
// O middleware permite o acesso somente a alunos.
router.get('/noa', permitirPerfis('aluno'), async (req, res) => {
  // Obtém o ID do aluno armazenado na sessão.
  const alunoId = req.session.usuario!.id;

  // Busca as atividades NOA cadastradas.
  const todas = await listarAtividadesNoa();

  // Busca as inscrições pertencentes ao aluno autenticado.
  const inscricoes = await listarInscricoesNoaAluno(alunoId);

  // Cria um conjunto com os identificadores das atividades inscritas.
  const idsInscritos = new Set(inscricoes.map(i => i.id));

  // Mantém somente atividades disponíveis e indica se o aluno já está inscrito.
  const atividades = todas
    .filter(a => a.disponivel)
    .map(a => ({ ...a, inscrito: idsInscritos.has(a.id) }));

  // Armazena as inscrições do aluno para exibição no template.
  const minhasInscricoes = inscricoes;

  // Renderiza a página NOA com as atividades e as inscrições do aluno.
  res.render('noa/noa', { atividades, minhasInscricoes });
});

// ---------------------------------------------------------------------
// Inscrição em uma atividade NOA
// ---------------------------------------------------------------------

// Registra uma rota POST para inscrever um aluno em uma atividade NOA.
router.post('/noa/:id/inscrever', permitirPerfis('aluno'), async (req, res) => {
  // Realiza a inscrição utilizando o ID do aluno autenticado e o ID da atividade.
  await enroll(req.session.usuario!.id, String(req.params.id));

  // Retorna HTTP 201, indicando criação ou confirmação da inscrição.
  res.status(201).json({ success: true, message: 'Inscrição confirmada.' });
});

// ---------------------------------------------------------------------
// Cancelamento de inscrição em uma atividade NOA
// ---------------------------------------------------------------------

// Registra uma rota POST para cancelar a inscrição de um aluno.
router.post('/noa/:id/cancelar', permitirPerfis('aluno'), async (req, res) => {
  // Chama o serviço de inscrição com o terceiro argumento ativado para cancelar.
  await enroll(req.session.usuario!.id, String(req.params.id), true);

  // Retorna uma resposta JSON confirmando o cancelamento da inscrição.
  res.json({ success: true, message: 'Inscrição cancelada.' });
});

// ---------------------------------------------------------------------
// Administração do sistema
// ---------------------------------------------------------------------

// Registra uma rota GET para acessar o painel administrativo.
// Somente usuários com perfil de administrador podem acessar.
router.get('/admin', permitirPerfis('administrador'), async (_req, res) => {
  // Recupera o estado atual da aplicação.
  const s = await state();

  // Renderiza o painel administrativo com salas, aulas e usuários.
  res.render('admin/admin-panel', {
    salas: s.salas, // Disponibiliza as salas cadastradas.
    aulas: s.aulas.map(a => classView(a, s)), // Prepara as aulas para exibição.
    usuarios: s.usuarios.map(safeUser) // Prepara os usuários sem expor dados sensíveis.
  });
});

// ---------------------------------------------------------------------
// Tipos de registros administrativos
// ---------------------------------------------------------------------

// Define os tipos de registros que podem ser administrados.
const kinds = ['salas', 'usuarios', 'aulas-grade'] as const;

// Converte um valor recebido em um tipo de registro válido.
function kindOf(value: string): typeof kinds[number] {
  // Aceita 'horarios' como apelido para 'aulas-grade'.
  const normalized = value === 'horarios' ? 'aulas-grade' : value;

  // Verifica se o tipo normalizado está entre os tipos permitidos.
  if (!(kinds as readonly string[]).includes(normalized)) {
    // Retorna HTTP 404 se o tipo de cadastro não for reconhecido.
    throw new HttpError(404, 'Cadastro não encontrado.');
  }

  // Retorna o tipo validado para uso nos serviços administrativos.
  return normalized as typeof kinds[number];
}

// ---------------------------------------------------------------------
// Página de edição de registros administrativos
// ---------------------------------------------------------------------

// Registra uma rota GET para abrir o formulário de edição.
// O acesso é restrito a administradores.
router.get('/admin/:kind/edit', permitirPerfis('administrador'), async (req, res) => {
  // Recupera o estado e valida o tipo de cadastro recebido na URL.
  const s = await state(), kind = kindOf(String(req.params.kind));

  // Seleciona a coleção de acordo com o tipo de registro solicitado.
  const rows = kind === 'salas'
    ? s.salas
    : kind === 'usuarios'
      ? s.usuarios
      : s.aulas;

  // Procura o registro pelo ID, quando informado; caso contrário, prepara um objeto vazio.
  const record = req.query.id
    ? rows.find(r => r.id === req.query.id)
    : {};

  // Retorna 404 quando foi solicitado um ID inexistente.
  if (!record) throw new HttpError(404, 'Registro não encontrado.');

  // Renderiza o formulário administrativo com os dados necessários.
  res.render('admin/edit', {
    kind, // Informa o tipo de registro a ser editado.
    record: kind === 'usuarios' ? safeUser(record) : record, // Protege os dados de usuário.
    salas: s.salas, // Disponibiliza as salas para seleção.
    professores: s.usuarios.filter(u => u.perfil === 'professor'), // Disponibiliza os professores.
    endpoint: '/admin/' + kind + (record.id ? '/' + record.id : ''), // Define a rota de envio do formulário.
    back: '/admin' // Define o caminho de retorno ao painel administrativo.
  });
});

// ---------------------------------------------------------------------
// Criação de registros administrativos
// ---------------------------------------------------------------------

// Registra uma rota POST para criar salas, usuários ou aulas.
// Somente administradores podem executar essa operação.
router.post('/admin/:kind', permitirPerfis('administrador'), async (req, res) => {
  // Valida o tipo de registro solicitado.
  const kind = kindOf(String(req.params.kind));

  // Executa a função de criação correspondente ao tipo de cadastro.
  const record = kind === 'salas'
    ? await saveRoom(req.body || {}) // Cria uma sala.
    : kind === 'usuarios'
      ? await saveUser(req.body || {}) // Cria um usuário.
      : await saveClass(req.body || {}, res.locals.usuario); // Cria uma aula.

  // Retorna HTTP 201 com os dados do registro criado.
  res.status(201).json({ success: true, record });
});

// ---------------------------------------------------------------------
// Atualização de registros administrativos
// ---------------------------------------------------------------------

// Registra uma rota PUT para atualizar um registro existente.
router.put('/admin/:kind/:id', permitirPerfis('administrador'), async (req, res) => {
  // Valida o tipo de cadastro e normaliza o identificador para string.
  const kind = kindOf(String(req.params.kind)), id = String(req.params.id);

  // Executa a atualização correspondente ao tipo de registro.
  const record = kind === 'salas'
    ? await saveRoom(req.body || {}, id) // Atualiza uma sala existente.
    : kind === 'usuarios'
      ? await saveUser(req.body || {}, id, req.session.usuario!.id) // Atualiza um usuário.
      : await saveClass(req.body || {}, res.locals.usuario, id); // Atualiza uma aula.

  // Retorna uma resposta JSON com o registro atualizado.
  res.json({ success: true, record });
});

// ---------------------------------------------------------------------
// Remoção de registros administrativos
// ---------------------------------------------------------------------

// Registra uma rota DELETE para remover um registro existente.
// O acesso é restrito a administradores.
router.delete('/admin/:kind/:id', permitirPerfis('administrador'), async (req, res) => {
  // Valida o tipo e solicita a remoção usando o ID do registro e do administrador.
  await removeRecord(
    kindOf(String(req.params.kind)),
    String(req.params.id),
    req.session.usuario!.id
  );

  // Retorna uma resposta JSON confirmando a remoção.
  res.json({ success: true, message: 'Registro removido.' });
});

// ---------------------------------------------------------------------
// Exportação do Router
// ---------------------------------------------------------------------

// Exporta todas as rotas para que possam ser registradas na aplicação Express.
export default router;
