import { Router } from 'express';
import { autenticado } from '../middlewares/authMiddleware';
import { permitirPerfis } from '../middlewares/perfilMiddleware';
import {
  state, classView, enroll, saveRoom, saveClass, saveUser, removeRecord, cancelClass, safeUser,
  listarProximasAulasProfessor, listarSalasDisponiveisAgora, listarCronogramaAluno,
  listarAtividadesNoa, listarInscricoesNoaAluno, buscarAulas,
} from '../services/SchoolService';
import { schoolNow, vigente, semesterRange, HttpError } from '../services/validation';

const router = Router();
router.use(autenticado);

// ------------------------------------------------------------
// Dashboard — detecta perfil e renderiza a view correta
// ------------------------------------------------------------
router.get('/dashboard', async (_req, res) => {
  const s = await state();
  const user = res.locals.usuario;
  const perfil = user.perfil;
  const hoje = schoolNow().slice(0, 10);

  // Métricas globais (usadas pelos 3 perfis)
  const metricas = {
    salas: s.salas.length,
    professores: s.usuarios.filter(u => u.perfil === 'professor' && u.ativo).length,
    alunos: s.usuarios.filter(u => u.perfil === 'aluno' && u.ativo).length,
    reservas: s.reservas.filter(r => r.status === 'confirmada' && r.data + 'T' + r.horarioFim > schoolNow()).length,
  };

  if (perfil === 'professor') {
    const aulas = await listarProximasAulasProfessor(user.id);
    const salasDisponiveis = await listarSalasDisponiveisAgora();
    const minhasReservas = s.reservas
      .filter(r => r.professorId === user.id && r.status === 'confirmada' && r.data + 'T' + r.horarioFim > schoolNow())
      .map(r => ({
        ...r,
        sala: s.salas.find(x => x.id === r.salaId)?.nome || 'Sala indisponível',
        horario: r.horarioInicio + ' — ' + r.horarioFim,
      }));
    return res.render('dashboard/dashboard-professor', { aulas, salasDisponiveis, minhasReservas, metricas });
  }

  if (perfil === 'aluno') {
    const aulas = user.turma ? await listarCronogramaAluno(user.turma) : [];
    const inscricoesNoa = await listarInscricoesNoaAluno(user.id);
    return res.render('dashboard/dashboard-aluno', { aulas, inscricoesNoa, metricas });
  }

  if (perfil === 'administrador') {
    const aulas = s.aulas
      .filter(a => a.ativa !== false && vigente(a, hoje))
      .map(a => classView(a, s));
    const reservasPendentes = s.reservas.filter(r => r.status === 'confirmada' && r.data >= hoje);
    const salasInativas = s.salas.filter(r => r.ativa === false);
    return res.render('dashboard/dashboard-admin', { aulas, reservasPendentes, salasInativas, metricas });
  }

  throw new HttpError(403, 'Perfil não reconhecido para dashboard.');
});

// ------------------------------------------------------------
// Pesquisa de aulas
// ------------------------------------------------------------
router.get('/search', async (req, res) => {
  const filtros = {
    disciplina: typeof req.query.disciplina === 'string' ? req.query.disciplina : undefined,
    professor:  typeof req.query.professor  === 'string' ? req.query.professor  : undefined,
    sala:       typeof req.query.sala       === 'string' ? req.query.sala       : undefined,
    turno:      typeof req.query.turno      === 'string' ? req.query.turno      : undefined,
    diaSemana:  typeof req.query.diaSemana  === 'string' ? req.query.diaSemana  : undefined,
    semestre:   typeof req.query.semestre   === 'string' ? req.query.semestre   : undefined,
    q:          typeof req.query.q          === 'string' ? req.query.q.trim()   : undefined,
  };
  const aulas = await buscarAulas(filtros);
  const busca = filtros.q ?? '';
  res.render('search/search-filters', { aulas, busca });
});

router.get('/classes', (_req, res) => { res.redirect('/search'); });

router.get('/classes/details', async (req, res) => {
  const s = await state(), id = String(req.query.id || '');
  const aula = s.aulas.find(a => a.id === id);
  if (!aula) throw new HttpError(404, 'Aula não encontrada.');
  res.render('classes/class-details', { aula: classView(aula, s) });
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

router.post('/classes/:id/cancelar', permitirPerfis('professor', 'administrador'), async (req, res) => {
  await cancelClass(String(req.params.id), res.locals.usuario);
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
  if (!(kinds as readonly string[]).includes(value)) throw new HttpError(404, 'Cadastro não encontrado.');
  return value as typeof kinds[number];
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