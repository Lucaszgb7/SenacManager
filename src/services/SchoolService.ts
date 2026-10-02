import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { readData, writeData, transaction, RecordData, Collection } from './store';
import { required, flag, strings, validated, HttpError, schoolNow, vigente, overlaps, semesterRange } from './validation';
import { Professor } from '../models/Professor';
import { Aluno } from '../models/Aluno';
import { Administrador } from '../models/Administrador';
import { Sala } from '../models/Sala';
import { Reserva } from '../models/Reserva';
import { AulaGrade } from '../models/AulaGrade';

export function userModel(data: RecordData) {
  const perfil = data.perfil === 'admin' ? 'administrador' : data.perfil;
  if (perfil === 'professor') return Professor.fromJSON(data);
  if (perfil === 'aluno') return Aluno.fromJSON(data);
  if (perfil === 'administrador') return Administrador.fromJSON(data);
  throw new HttpError(400, 'Perfil inválido.');
}

export function safeUser(u: RecordData): RecordData {
  const { senhaHash, ...safe } = u;
  return safe;
}

export async function users(): Promise<RecordData[]> {
  return (await readData('usuarios')).map(u => ({ ...u, ...userModel(u).toJSON(), ativo: u.ativo !== false }));
}

export async function state() {
  const [usuarios, salas, reservas, aulas, inscricoes] = await Promise.all([users(), readData('salas'), readData('reservas'), readData('aulas-grade'), readData('inscricoes-noa')]);
  return { usuarios, salas, reservas, aulas, inscricoes };
}

function mustFind(rows: RecordData[], id: string, name: string) {
  const row = rows.find(r => r.id === id);
  if (!row) throw new HttpError(404, name + ' não encontrado.');
  return row;
}

export async function findUser(id: string) { return (await users()).find(u => u.id === id); }

export async function authenticate(email: unknown, password: unknown) {
  const target = required(email, 'E-mail').toLowerCase();
  const secret = required(password, 'Senha');
  const u = (await users()).find(u => u.email === target && u.ativo);
  if (!u || !await bcrypt.compare(secret, u.senhaHash)) throw new HttpError(401, 'E-mail ou senha inválidos.');
  return safeUser(u);
}

function normalizeUser(data: RecordData): RecordData {
  const nome = required(data.nome, 'Nome', 3);
  const email = required(data.email, 'E-mail').toLowerCase();
  const perfil = required(data.perfil, 'Perfil');
  const model = validated(() => userModel({ ...data, nome, email, perfil }));
  return { ...data, ...model.toJSON(), ativo: flag(data.ativo, true) };
}

export async function saveUser(data: RecordData, id?: string, actorId?: string) {
  return transaction(async () => {
    const s = await state();
    const previous = id ? mustFind(s.usuarios, id, 'Usuário') : undefined;
    if (previous && actorId === id && (data.ativo === false || (data.perfil && data.perfil !== previous.perfil))) throw new HttpError(409, 'Você não pode desativar sua conta ou alterar seu próprio perfil.');
    let senhaHash = previous?.senhaHash;
    if (!previous || data.senha) {
      const senha = required(data.senha, 'Senha', 8);
      senhaHash = await bcrypt.hash(senha, 10);
    }
    const input: RecordData = { ...(previous || {}), id: id || randomUUID(), criadoEm: previous?.criadoEm || new Date().toISOString(), senhaHash,
      nome: data.nome, email: data.email, perfil: data.perfil, ativo: flag(data.ativo, previous?.ativo ?? true),
      disciplinas: strings(data.disciplinas ?? previous?.disciplinas), curso: data.curso ?? previous?.curso, turma: data.turma ?? previous?.turma,
      telefone: previous?.telefone ?? null, fotoUrl: previous?.fotoUrl ?? null };
    const u = normalizeUser(input);
    if (s.usuarios.some(other => other.id !== u.id && other.email === u.email)) throw new HttpError(409, 'E-mail já cadastrado.');
    if (previous?.perfil === 'administrador' && previous.ativo && (u.perfil !== 'administrador' || !u.ativo) && s.usuarios.filter(x => x.perfil === 'administrador' && x.ativo).length <= 1) throw new HttpError(409, 'Mantenha pelo menos um administrador ativo.');
    if (previous && previous.perfil !== u.perfil && (s.aulas.some(a => a.professorId === id) || s.reservas.some(r => r.professorId === id) || s.inscricoes.some(i => i.alunoId === id))) throw new HttpError(409, 'Usuário possui registros vinculados; não é possível alterar o perfil.');
    await writeData('usuarios', previous ? s.usuarios.map(x => x.id === id ? u : x) : [...s.usuarios, u]);
    return safeUser(u);
  });
}

export async function updateProfile(id: string, data: RecordData) {
  return transaction(async () => {
    const rows = await users();
    const previous = mustFind(rows, id, 'Usuário');
    const allowed: RecordData = { nome: required(data.nome, 'Nome', 3), email: required(data.email, 'E-mail').toLowerCase(), telefone: data.telefone == null || data.telefone === '' ? null : required(data.telefone, 'Telefone') };
    if (previous.perfil === 'aluno') { allowed.curso = data.curso ?? previous.curso; allowed.turma = data.turma ?? previous.turma; }
    if (previous.perfil === 'professor') allowed.disciplinas = strings(data.disciplinas ?? previous.disciplinas);
    const next = normalizeUser({ ...previous, ...allowed });
    if (rows.some(u => u.id !== id && u.email === next.email)) throw new HttpError(409, 'E-mail já cadastrado.');
    await writeData('usuarios', rows.map(u => u.id === id ? next : u));
    return safeUser(next);
  });
}

export async function changePassword(id: string, current: unknown, next: unknown) {
  return transaction(async () => {
    const rows = await users();
    const user = mustFind(rows, id, 'Usuário');
    const old = required(current, 'Senha atual');
    const nova = required(next, 'Nova senha', 8);
    if (!await bcrypt.compare(old, user.senhaHash)) throw new HttpError(401, 'Senha atual incorreta.');
    if (old === nova) throw new HttpError(400, 'Use uma senha diferente da atual.');
    user.senhaHash = await bcrypt.hash(nova, 10);
    await writeData('usuarios', rows);
  });
}

export async function setAvatar(id: string, url: string) {
  return transaction(async () => {
    const rows = await users();
    const u = mustFind(rows, id, 'Usuário');
    const previous = u.fotoUrl;
    u.fotoUrl = url;
    await writeData('usuarios', rows);
    return previous as string | null;
  });
}

export function classView(a: RecordData, s: Awaited<ReturnType<typeof state>>): RecordData {
  const professor = s.usuarios.find(u => u.id === a.professorId);
  const sala = s.salas.find(r => r.id === a.salaId);
  return { ...a, professor: { id: a.professorId, nome: professor?.nome || 'Professor indisponível', iniciais: (professor?.nome || '?').split(' ').map((x: string) => x[0]).slice(0, 2).join('') },
    sala: sala?.nome || 'Sala indisponível', predio: sala?.predio || '', horario: a.horarioInicio + ' — ' + a.horarioFim, descricao: a.descricao || '' };
}

export async function createBooking(id: string, data: RecordData) {
  return transaction(async () => {
    const s = await state();
    const professor = mustFind(s.usuarios, id, 'Professor');
    if (professor.perfil !== 'professor' || !professor.ativo) throw new HttpError(403, 'Apenas professores ativos podem reservar.');
    const sala = mustFind(s.salas, required(data.salaId, 'Sala'), 'Sala');
    if (sala.ativa === false) throw new HttpError(409, 'Sala inativa.');
    const reserva = validated(() => new Reserva(sala.id, id, required(data.disciplina, 'Disciplina', 2), required(data.turma, 'Turma'), required(data.data, 'Data'), required(data.horarioInicio, 'Início'), required(data.horarioFim, 'Término'))).toJSON();
    if (reserva.data + 'T' + reserva.horarioInicio <= schoolNow()) throw new HttpError(400, 'Escolha um horário futuro.');
    if (s.reservas.some(r => r.status === 'confirmada' && r.data === reserva.data && (r.salaId === sala.id || r.professorId === id) && overlaps(r, reserva)) ||
        s.aulas.some(a => (a.salaId === sala.id || a.professorId === id) && vigente(a, reserva.data) && overlaps(a, reserva))) throw new HttpError(409, 'Já existe uma aula ou reserva neste horário para a sala ou professor.');
    await writeData('reservas', [...s.reservas, reserva]);
    return reserva;
  });
}

export async function cancelBooking(actor: string, id: string) {
  return transaction(async () => {
    const rows = await readData('reservas');
    const r = mustFind(rows, id, 'Reserva');
    if (r.professorId !== actor) throw new HttpError(403, 'Esta reserva pertence a outro professor.');
    if (r.data + 'T' + r.horarioFim <= schoolNow()) throw new HttpError(409, 'Reserva já encerrada.');
    r.status = 'cancelada';
    await writeData('reservas', rows);
  });
}

export async function saveRoom(data: RecordData, id?: string) {
  return transaction(async () => {
    const s = await state();
    const previous = id ? mustFind(s.salas, id, 'Sala') : {};
    const sala = validated(() => new Sala(required(data.nome, 'Nome', 2), data.capacidade, strings(data.recursos), required(data.predio, 'Prédio'), data.andar || undefined, id)).toJSON();
    const next: RecordData = { ...previous, ...sala, ativa: flag(data.ativa, true) };
    if (s.aulas.some(a => a.salaId === id && a.isNoa && (a.vagasTotal || 0) > next.capacidade)) throw new HttpError(409, 'A capacidade é menor que o limite de uma atividade NOA vinculada.');
    await writeData('salas', id ? s.salas.map(r => r.id === id ? next : r) : [...s.salas, next]);
    return next;
  });
}

export async function saveClass(data: RecordData, actor: RecordData, id?: string) {
  return transaction(async () => {
    const s = await state();
    const previous = id ? mustFind(s.aulas, id, 'Aula') : undefined;
    if (actor.perfil !== 'administrador' && (!previous || previous.professorId !== actor.id)) throw new HttpError(403, 'Sem permissão para editar a aula.');
    const professorId = actor.perfil === 'administrador' ? required(data.professorId, 'Professor') : previous!.professorId;
    const professor = mustFind(s.usuarios, professorId, 'Professor');
    const sala = mustFind(s.salas, required(data.salaId, 'Sala'), 'Sala');
    if (professor.perfil !== 'professor' || !professor.ativo || sala.ativa === false) throw new HttpError(400, 'Selecione professor e sala ativos.');
    const semestre = required(data.semestre, 'Semestre');
    const range = semesterRange(semestre);
    const aula = validated(() => new AulaGrade(required(data.disciplina, 'Disciplina', 2), professorId, sala.id, required(data.turma, 'Turma'), data.diaSemana, required(data.horarioInicio, 'Início'), required(data.horarioFim, 'Término'), flag(data.isNoa, false), id)).toJSON();
    const vagasTotal = aula.isNoa ? data.vagasTotal : 0;
    if (aula.isNoa && (!Number.isInteger(vagasTotal) || vagasTotal < 1 || vagasTotal > sala.capacidade)) throw new HttpError(400, 'Vagas devem ser positivas e não exceder a capacidade da sala.');
    const inscricoes = s.inscricoes.filter(i => i.aulaId === id);
    if (inscricoes.length && (!aula.isNoa || vagasTotal < inscricoes.length)) throw new HttpError(409, 'Existem inscrições incompatíveis com essa alteração.');
    const next: RecordData = { ...previous, ...aula, semestre, vagasTotal, ativa: flag(data.ativa, true), descricao: typeof data.descricao === 'string' ? data.descricao.trim() : '' };
    if (next.ativa && (s.aulas.some(a => a.id !== id && a.ativa !== false && a.semestre === semestre && a.diaSemana === next.diaSemana && (a.salaId === sala.id || a.professorId === professorId) && overlaps(a, next)) ||
      s.reservas.some(r => r.status === 'confirmada' && r.data >= range[0] && r.data <= range[1] && vigente(next, r.data) && (r.salaId === sala.id || r.professorId === professorId) && overlaps(r, next)))) throw new HttpError(409, 'Horário conflita com outra aula ou reserva.');
    await writeData('aulas-grade', id ? s.aulas.map(a => a.id === id ? next : a) : [...s.aulas, next]);
    return next;
  });
}

export async function cancelClass(id: string, actor: RecordData) {
  return transaction(async () => {
    const rows = await readData('aulas-grade');
    const a = mustFind(rows, id, 'Aula');
    if (actor.perfil !== 'administrador' && !(actor.perfil === 'professor' && a.professorId === actor.id)) throw new HttpError(403, 'Sem permissão.');
    a.ativa = false;
    await writeData('aulas-grade', rows);
  });
}

export async function removeRecord(collection: 'usuarios' | 'salas' | 'aulas-grade', id: string, actorId: string) {
  return transaction(async () => {
    const s = await state();
    const rows = collection === 'usuarios' ? s.usuarios : collection === 'salas' ? s.salas : s.aulas;
    const row = mustFind(rows, id, 'Registro');
    if (collection === 'usuarios' && (id === actorId || (row.perfil === 'administrador' && row.ativo && s.usuarios.filter(u => u.perfil === 'administrador' && u.ativo).length <= 1))) throw new HttpError(409, 'Não é possível remover essa conta administrativa.');
    const linked = collection === 'usuarios' ? s.reservas.some(r => r.professorId === id) || s.aulas.some(a => a.professorId === id) || s.inscricoes.some(i => i.alunoId === id)
      : collection === 'salas' ? s.reservas.some(r => r.salaId === id) || s.aulas.some(a => a.salaId === id) : s.inscricoes.some(i => i.aulaId === id);
    if (linked) throw new HttpError(409, 'Registro possui vínculos. Desative-o em vez de excluir.');
    await writeData(collection, rows.filter(r => r.id !== id));
  });
}

export async function enroll(alunoId: string, aulaId: string, cancel = false) {
  return transaction(async () => {
    const s = await state();
    const user = mustFind(s.usuarios, alunoId, 'Aluno');
    if (user.perfil !== 'aluno' || !user.ativo) throw new HttpError(403, 'Apenas alunos ativos podem se inscrever.');
    if (cancel) { await writeData('inscricoes-noa', s.inscricoes.filter(i => !(i.aulaId === aulaId && i.alunoId === alunoId))); return; }
    const a = mustFind(s.aulas, aulaId, 'Atividade');
    const sala = mustFind(s.salas, a.salaId, 'Sala');
    const professor = mustFind(s.usuarios, a.professorId, 'Professor');
    const [start, end] = semesterRange(a.semestre);
    const today = schoolNow().slice(0, 10);
    if (!a.isNoa || a.ativa === false || sala.ativa === false || !professor.ativo || today < start || today > end) throw new HttpError(409, 'Atividade não está disponível para inscrição.');
    if (s.inscricoes.some(i => i.aulaId === aulaId && i.alunoId === alunoId)) throw new HttpError(409, 'Você já está inscrito.');
    if (s.inscricoes.filter(i => i.aulaId === aulaId).length >= Math.min(a.vagasTotal, sala.capacidade)) throw new HttpError(409, 'Não há vagas.');
    await writeData('inscricoes-noa', [...s.inscricoes, { id: randomUUID(), alunoId, aulaId, criadoEm: new Date().toISOString() }]);
  });
}

// ============================================================
// Consultas de leitura para as telas (dashboard, noa, search).
// Reaproveitam state() e classView para manter um único ponto
// de verdade sobre como uma aula é apresentada.
// ============================================================

export type FiltrosBusca = {
  disciplina?: string;
  professor?: string;
  sala?: string;
  turno?: string;
  diaSemana?: string;
  semestre?: string;
  q?: string;
};

// Deriva o turno a partir do horário de início da aula.
// Manhã: <12h · Tarde: 12h–17h59 · Noite: >=18h
function turnoDe(horarioInicio: string): 'manha' | 'tarde' | 'noite' {
  const hora = Number(String(horarioInicio).slice(0, 2));
  if (hora < 12) return 'manha';
  if (hora < 18) return 'tarde';
  return 'noite';
}

// Aulas do dia para um professor específico.
export async function listarProximasAulasProfessor(professorId: string): Promise<RecordData[]> {
  const s = await state();
  const hoje = schoolNow().slice(0, 10);
  return s.aulas
    .filter(a => a.ativa !== false && a.professorId === professorId && vigente(a, hoje))
    .map(a => ({ ...classView(a, s), turno: turnoDe(a.horarioInicio) }));
}

// Salas sem reserva confirmada (nem aula vigente) no horário atual.
export async function listarSalasDisponiveisAgora(): Promise<RecordData[]> {
  const s = await state();
  const agora = schoolNow(); // "YYYY-MM-DDTHH:mm"
  const hoje = agora.slice(0, 10);
  const hora = agora.slice(11, 16);
  const ocupadas = new Set<string>();

  for (const r of s.reservas) {
    if (r.status !== 'confirmada') continue;
    if (r.data !== hoje) continue;
    if (hora >= r.horarioInicio && hora < r.horarioFim) ocupadas.add(r.salaId);
  }
  for (const a of s.aulas) {
    if (a.ativa === false) continue;
    if (!vigente(a, hoje)) continue;
    if (hora >= a.horarioInicio && hora < a.horarioFim) ocupadas.add(a.salaId);
  }
  return s.salas.filter(r => r.ativa !== false && !ocupadas.has(r.id));
}

// Aulas do dia para uma turma (usado no dashboard do aluno).
export async function listarCronogramaAluno(turma: string): Promise<RecordData[]> {
  const s = await state();
  const hoje = schoolNow().slice(0, 10);
  return s.aulas
    .filter(a => a.ativa !== false && a.turma === turma && vigente(a, hoje))
    .map(a => ({ ...classView(a, s), turno: turnoDe(a.horarioInicio) }));
}

// Todas as atividades NOA com status de disponibilidade calculado.
export async function listarAtividadesNoa(): Promise<RecordData[]> {
  const s = await state();
  const hoje = schoolNow().slice(0, 10);
  return s.aulas
    .filter(a => a.isNoa)
    .map(a => {
      const [start, end] = semesterRange(a.semestre);
      const sala = s.salas.find(r => r.id === a.salaId);
      const professor = s.usuarios.find(u => u.id === a.professorId);
      const disponivel =
        a.ativa !== false &&
        hoje >= start && hoje <= end &&
        !!sala && sala.ativa !== false &&
        !!professor && professor.ativo;
      return {
        ...classView(a, s),
        turno: turnoDe(a.horarioInicio),
        disponivel,
        vagasOcupadas: s.inscricoes.filter(i => i.aulaId === a.id).length,
      };
    });
}

// Inscrições NOA de um aluno (com o detalhe da atividade).
export async function listarInscricoesNoaAluno(alunoId: string): Promise<RecordData[]> {
  const s = await state();
  return s.inscricoes
    .filter(i => i.alunoId === alunoId)
    .map(i => {
      const a = s.aulas.find(x => x.id === i.aulaId);
      return a ? { ...classView(a, s), inscricaoId: i.id, inscritoEm: i.criadoEm } : null;
    })
    .filter((x): x is RecordData => x !== null);
}

// Busca de aulas com filtros opcionais. Todos são combinados com AND.
// Se só `q` vier, faz busca textual ampla (compatível com a tela atual).
export async function buscarAulas(filtros: FiltrosBusca = {}): Promise<RecordData[]> {
  const s = await state();
  const norm = (v: unknown) => String(v ?? '').trim().toLocaleLowerCase('pt-BR');
  const disciplina = norm(filtros.disciplina);
  const professor = norm(filtros.professor);
  const sala = norm(filtros.sala);
  const turno = norm(filtros.turno);
  const diaSemana = norm(filtros.diaSemana);
  const semestre = norm(filtros.semestre);
  const q = norm(filtros.q);

  return s.aulas
    .map(a => ({ ...classView(a, s), turno: turnoDe(a.horarioInicio) }))
    .filter(a => {
      if (disciplina && !norm(a.disciplina).includes(disciplina)) return false;
      if (professor && !norm(a.professor?.nome).includes(professor)) return false;
      if (sala && !norm(a.sala).includes(sala)) return false;
      if (turno && a.turno !== turno) return false;
      if (diaSemana && norm(a.diaSemana) !== diaSemana) return false;
      if (semestre && norm(a.semestre) !== semestre) return false;
      if (q) {
        const blob = [a.disciplina, a.professor?.nome, a.sala, a.turma, a.diaSemana, a.semestre]
          .map(norm).join(' ');
        if (!blob.includes(q)) return false;
      }
      return true;
    });
}