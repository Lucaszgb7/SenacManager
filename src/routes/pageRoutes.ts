import { Router } from 'express';
import { autenticado } from '../middlewares/authMiddleware';
import { permitirPerfis } from '../middlewares/perfilMiddleware';
import {
  state, classView, enroll, saveRoom, saveClass, saveUser, removeRecord, cancelClass, safeUser,
  atualizarStatusUsuario, buscarAulaPorId, cancelBooking,
  listarAtividadesNoa, listarInscricoesNoaAluno,
} from '../services/SchoolService';
import { schoolNow, vigente, semesterRange, HttpError, flag } from '../services/validation';

const router = Router();
router.use(autenticado);
router.get('/dashboard', async (req, res) => {
  const s = await state(), user = res.locals.usuario;
  const today = schoolNow().slice(0, 10);
  const aulas = s.aulas.filter(a => a.ativa !== false && (user.perfil === 'administrador' || a.professorId === user.id || (user.perfil === 'aluno' && (a.turma === user.turma || s.inscricoes.some(i => i.aulaId === a.id && i.alunoId === user.id))))).filter(a => vigente(a, today)).map(a => classView(a, s));
  
  const metricas = {
    salas: s.salas.length,
    professores: s.usuarios.filter(u => u.perfil === 'professor' && u.ativo).length,
    alunos: s.usuarios.filter(u => u.perfil === 'aluno' && u.ativo).length,
    reservas: s.reservas.filter(r => r.status === 'confirmada' && r.data + 'T' + r.horarioFim > schoolNow()).length
  };

  const salasPorPredio: Record<string, number> = {};
  s.salas.forEach(sala => {
    const p = sala.predio || 'Bloco Principal';
    salasPorPredio[p] = (salasPorPredio[p] || 0) + 1;
  });

  const aulasPorDia: Record<string, number> = {
    'Segunda': 0, 'Terça': 0, 'Quarta': 0, 'Quinta': 0, 'Sexta': 0, 'Sábado': 0
  };
  const mapDia: Record<string, string> = {
    'segunda': 'Segunda', 'terca': 'Terça', 'quarta': 'Quarta',
    'quinta': 'Quinta', 'sexta': 'Sexta', 'sabado': 'Sábado'
  };
  s.aulas.filter(a => a.ativa !== false).forEach(a => {
    const d = mapDia[a.diaSemana];
    if (d && aulasPorDia[d] !== undefined) aulasPorDia[d]++;
  });

  const proximasReservas = s.reservas
    .filter(r => r.status === 'confirmada' && (user.perfil === 'administrador' || r.professorId === user.id))
    .slice(0, 5)
    .map(r => {
      const sala = s.salas.find(sal => sal.id === r.salaId);
      const prof = s.usuarios.find(u => u.id === r.professorId);
      return {
        ...r,
        salaNome: sala ? sala.nome : 'Sala',
        predio: sala ? sala.predio : '',
        professorNome: prof ? prof.nome : 'Professor'
      };
    });

  const inscricoesNoa = user.perfil === 'aluno'
    ? s.inscricoes
        .filter(i => i.alunoId === user.id)
        .map(i => {
          const aula = s.aulas.find(a => a.id === i.aulaId);
          return aula ? classView(aula, s) : null;
        })
        .filter(Boolean)
    : [];

  const totalSalasAtivas = s.salas.filter(sal => sal.ativa !== false).length;
  const totalSalasInativas = s.salas.filter(sal => sal.ativa === false).length;
  const totalAtividadesNoa = s.aulas.filter(a => a.isNoa && a.ativa !== false).length;

  res.render('dashboard/dashboard', {
    aulas,
    metricas,
    salasPorPredio,
    aulasPorDia,
    proximasReservas,
    inscricoesNoa,
    totalSalasAtivas,
    totalSalasInativas,
    totalAtividadesNoa
  });
});

// ------------------------------------------------------------
// GET /search — pesquisa de aulas com filtros combináveis
// Mantém busca por texto (q) e adiciona filtros por disciplina,
// professor, turma e dia da semana. Preserva os filtros na query
// string para repopular o formulário após a pesquisa.
// ------------------------------------------------------------
router.get('/search', async (req, res) => {
  const s = await state();
  const user = res.locals.usuario;

  // Normaliza todos os filtros vindos da query string
  const q          = typeof req.query.q          === 'string' ? req.query.q.trim() : '';
  const disciplina = typeof req.query.disciplina === 'string' ? req.query.disciplina.trim() : '';
  const professor  = typeof req.query.professor  === 'string' ? req.query.professor.trim() : '';
  const turma      = typeof req.query.turma      === 'string' ? req.query.turma.trim() : '';
  const diaSemana  = typeof req.query.diaSemana  === 'string' ? req.query.diaSemana.trim() : '';

  const lower = (v: string) => v.toLocaleLowerCase('pt-BR');

  // Aplica a mesma visibilidade do /dashboard para não expor aulas
  // que o usuário não pode ver (admin vê tudo; professor só as suas;
  // aluno só da própria turma ou em que está inscrito).
  const aulasVisiveis = s.aulas
    .filter(a => a.ativa !== false)
    .filter(a =>
      user.perfil === 'administrador' ||
      a.professorId === user.id ||
      (user.perfil === 'aluno' && (
        a.turma === user.turma ||
        s.inscricoes.some(i => i.aulaId === a.id && i.alunoId === user.id)
      ))
    );

  // Aplica os filtros de forma combinada (AND entre filtros preenchidos).
  // Cada filtro só atua quando o usuário informou um valor.
  const aulas = aulasVisiveis
    .map(a => classView(a, s))
    .filter(a => {
      // Busca livre: continua funcionando como antes (procura em vários campos)
      if (q) {
        const blob = [a.disciplina, a.professor.nome, a.sala, a.turma, a.diaSemana, a.semestre]
          .join(' ')
          .toLocaleLowerCase('pt-BR');
        if (!blob.includes(lower(q))) return false;
      }
      // Filtro por disciplina (match parcial, case-insensitive)
      if (disciplina && !lower(a.disciplina).includes(lower(disciplina))) return false;
      // Filtro por professor (match parcial, case-insensitive)
      if (professor && !lower(a.professor.nome).includes(lower(professor))) return false;
      // Filtro por turma (match exato)
      if (turma && a.turma !== turma) return false;
      // Filtro por dia da semana (match exato)
      if (diaSemana && a.diaSemana !== diaSemana) return false;
      return true;
    });

  // Listas reais para popular os selects — derivadas do estado atual
  // (apenas professores com aulas visíveis e apenas turmas existentes)
  const professores = Array.from(
    new Set(aulasVisiveis.map(a => {
      const p = s.usuarios.find(u => u.id === a.professorId);
      return p ? p.nome : null;
    }).filter((v): v is string => Boolean(v)))
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const turmas = Array.from(
    new Set(aulasVisiveis.map(a => a.turma).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  // Dias da semana em formato "chave interna" usada no schema (ex.: 'segunda')
  // -> rótulo exibido no select. Ajuste o mapa se seu schema usar outro padrão.
  const diasSemana = [
    { valor: 'segunda', rotulo: 'Segunda-feira' },
    { valor: 'terca',   rotulo: 'Terça-feira'   },
    { valor: 'quarta',  rotulo: 'Quarta-feira'  },
    { valor: 'quinta',  rotulo: 'Quinta-feira'  },
    { valor: 'sexta',   rotulo: 'Sexta-feira'   },
    { valor: 'sabado',  rotulo: 'Sábado'        },
  ];

  // Indica se o usuário aplicou algum filtro (para exibir "sem resultados")
  const temFiltro = Boolean(q || disciplina || professor || turma || diaSemana);

  res.render('search/search-filters', {
    aulas,
    busca: q,           // compatibilidade com o template atual
    filtros: { q, disciplina, professor, turma, diaSemana },
    professores,
    turmas,
    diasSemana,
    temFiltro,
    semResultados: temFiltro && aulas.length === 0,
  });
});

router.get('/classes', (_req, res) => { res.redirect('/search'); });

router.get('/classes/details', async (req, res) => {
  const s = await state(), id = String(req.query.id || '');
  const aula = s.aulas.find(a => a.id === id);
  if (!aula) throw new HttpError(404, 'Aula não encontrada.');
  res.render('classes/class-details', { aula: classView(aula, s) });
});
router.get('/classes/:id', autenticado, async (req, res) => {
  const aula = await buscarAulaPorId(String(req.params.id));
  res.render('classes/class-details', { aula, usuario: res.locals.usuario });
});
router.get('/classes/:id/edit', permitirPerfis('professor', 'administrador'), async (req, res) => {
  const s = await state(), aula = s.aulas.find(a => a.id === req.params.id);
  if (!aula) throw new HttpError(404, 'Aula não encontrada.');
  if (res.locals.usuario.perfil !== 'administrador' && aula.professorId !== res.locals.usuario.id) throw new HttpError(403, 'Esta aula pertence a outro professor.');
  res.render('admin/edit', { kind: 'aulas-grade', record: aula, salas: s.salas, professores: s.usuarios.filter(u => u.perfil === 'professor'), endpoint: '/classes/' + aula.id, back: '/classes/details?id=' + aula.id });
});

router.put('/classes/:id', permitirPerfis('professor', 'administrador'), async (req, res) => {
  await saveClass(req.body || {}, res.locals.usuario, String(req.params.id));
  res.json({ success: true, message: 'Aula atualizada.' });
});
router.post('/classes/:id/cancelar', autenticado, permitirPerfis('professor', 'administrador'), async (req, res) => {
  const usuario = res.locals.usuario;
  const aula = await buscarAulaPorId(String(req.params.id));

  if (aula.tipo === 'reserva') {
    // cancelBooking só aceita o professor dono; para o admin usamos o dono da reserva
    const actorId = usuario.perfil === 'administrador' ? aula.professorId : usuario.id;
    await cancelBooking(actorId, aula.id);
    res.json({ success: true, message: 'Reserva cancelada.' });
    return;
  }

  await cancelClass(aula.id, usuario);
  res.json({ success: true, message: 'Aula cancelada.' });
});

// ------------------------------------------------------------
// NOA — Novas Oportunidades de Aprendizagem
// ------------------------------------------------------------
router.get('/noa', permitirPerfis('aluno'), async (req, res) => {
  const alunoId = req.session.usuario!.id;
  const todas = await listarAtividadesNoa();
  const inscricoes = await listarInscricoesNoaAluno(alunoId);
  const idsInscritos = new Set(inscricoes.map(i => i.id));

  const atividades = todas
    .filter(a => a.disponivel)
    .map(a => ({ ...a, inscrito: idsInscritos.has(a.id) }));

  const minhasInscricoes = inscricoes;

  res.render('noa/noa', { atividades, minhasInscricoes });
});

router.post('/noa/:id/inscrever', permitirPerfis('aluno'), async (req, res) => {
  await enroll(req.session.usuario!.id, String(req.params.id));
  res.status(201).json({ success: true, message: 'Inscrição confirmada.' });
});

router.post('/noa/:id/cancelar', permitirPerfis('aluno'), async (req, res) => {
  await enroll(req.session.usuario!.id, String(req.params.id), true);
  res.json({ success: true, message: 'Inscrição cancelada.' });
});

// ------------------------------------------------------------
// Administração
// ------------------------------------------------------------
router.get('/admin', permitirPerfis('administrador'), async (_req, res) => {
  const s = await state();
  res.render('admin/admin-panel', { salas: s.salas, aulas: s.aulas.map(a => classView(a, s)), usuarios: s.usuarios.map(safeUser) });
});

const kinds = ['salas','usuarios','aulas-grade'] as const;
function kindOf(value: string): typeof kinds[number] {
  // Normaliza o apelido público 'horarios' -> 'aulas-grade'
  const normalized = value === 'horarios' ? 'aulas-grade' : value;
  if (!(kinds as readonly string[]).includes(normalized)) throw new HttpError(404, 'Cadastro não encontrado.');
  return normalized as typeof kinds[number];
}

router.get('/admin/:kind/edit', permitirPerfis('administrador'), async (req, res) => {
  const s = await state(), kind = kindOf(String(req.params.kind));
  const rows = kind === 'salas' ? s.salas : kind === 'usuarios' ? s.usuarios : s.aulas;
  const record = req.query.id ? rows.find(r => r.id === req.query.id) : {};
  if (!record) throw new HttpError(404, 'Registro não encontrado.');
  res.render('admin/edit', { kind, record: kind === 'usuarios' ? safeUser(record) : record, salas: s.salas, professores: s.usuarios.filter(u => u.perfil === 'professor'), endpoint: '/admin/' + kind + (record.id ? '/' + record.id : ''), back: '/admin' });
});

router.post('/admin/:kind', permitirPerfis('administrador'), async (req, res) => {
  const kind = kindOf(String(req.params.kind));
  const record = kind === 'salas' ? await saveRoom(req.body || {}) : kind === 'usuarios' ? await saveUser(req.body || {}) : await saveClass(req.body || {}, res.locals.usuario);
  res.status(201).json({ success: true, record });
});

router.put('/admin/:kind/:id', permitirPerfis('administrador'), async (req, res) => {
  const kind = kindOf(String(req.params.kind)), id = String(req.params.id);
  const record = kind === 'salas' ? await saveRoom(req.body || {}, id) : kind === 'usuarios' ? await saveUser(req.body || {}, id, req.session.usuario!.id) : await saveClass(req.body || {}, res.locals.usuario, id);
  res.json({ success: true, record });
});

router.delete('/admin/:kind/:id', permitirPerfis('administrador'), async (req, res) => {
  await removeRecord(kindOf(String(req.params.kind)), String(req.params.id), req.session.usuario!.id);
  res.json({ success: true, message: 'Registro removido.' });
});
export default router;