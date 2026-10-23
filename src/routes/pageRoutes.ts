import { Router } from 'express';
import { autenticado } from '../middlewares/authMiddleware';
import { permitirPerfis } from '../middlewares/perfilMiddleware';
import { state, classView, enroll, saveRoom, saveClass, saveUser, removeRecord, cancelClass, safeUser, atualizarStatusUsuario, buscarAulaPorId, cancelBooking } from '../services/SchoolService';
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
router.get('/search', async (req, res) => {
  const s = await state();
  const busca = typeof req.query.q === 'string' ? req.query.q.trim().toLocaleLowerCase('pt-BR') : '';
  const aulas = s.aulas.map(a => classView(a, s)).filter(a => [a.disciplina, a.professor.nome, a.sala, a.turma, a.diaSemana, a.semestre].join(' ').toLocaleLowerCase('pt-BR').includes(busca));
  res.render('search/search-filters', { aulas, busca });
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
router.get('/noa', permitirPerfis('aluno'), async (req, res) => {
  const s = await state(), today = schoolNow().slice(0,10);
  const activities = s.aulas.filter(a => a.isNoa).map(a => {
    const [start, end] = semesterRange(a.semestre);
    return { ...classView(a, s), disponivel: a.ativa !== false && today >= start && today <= end && s.salas.some(r => r.id === a.salaId && r.ativa !== false) && s.usuarios.some(u => u.id === a.professorId && u.ativo), vagasOcupadas: s.inscricoes.filter(i => i.aulaId === a.id).length, inscrito: s.inscricoes.some(i => i.aulaId === a.id && i.alunoId === req.session.usuario!.id) };
  });
  res.render('noa/noa', { atividades: activities.filter(a => a.disponivel), minhasInscricoes: activities.filter(a => a.inscrito) });
});
router.post('/noa/:id/inscrever', permitirPerfis('aluno'), async (req, res) => {
  await enroll(req.session.usuario!.id, String(req.params.id));
  res.status(201).json({ success: true, message: 'Inscrição confirmada.' });
});
router.post('/noa/:id/cancelar', permitirPerfis('aluno'), async (req, res) => {
  await enroll(req.session.usuario!.id, String(req.params.id), true);
  res.json({ success: true, message: 'Inscrição cancelada.' });
});
router.get('/admin', permitirPerfis('administrador'), async (_req, res) => {
  const s = await state();
  res.render('admin/admin-panel', { salas: s.salas, aulas: s.aulas.map(a => classView(a, s)), usuarios: s.usuarios.map(safeUser) });
});

// ------------------------------------------------------------
// NOVA ROTA — toggle de status de usuário.
// Precisa vir ANTES de qualquer /admin/:kind/:id para não colidir
// com o PUT genérico (que tem só 2 segmentos). Aqui são 3 segmentos,
// mas mantemos a ordem por clareza.
// ------------------------------------------------------------
router.put('/admin/usuarios/:id/status', permitirPerfis('administrador'), async (req, res) => {
  const ativo = flag(req.body?.ativo, false);
  const usuario = await atualizarStatusUsuario(String(req.params.id), ativo, req.session.usuario!.id);
  res.json({ success: true, usuario });
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