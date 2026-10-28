import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { Server } from 'http';
import bcrypt from 'bcryptjs';

let directory: string;
let server: Server;
let base: string;
let cookie = '';
const password = 'SenhaTeste123!';
const professor = { id: 'prof-1', nome: 'Professor Teste', email: 'prof@example.com', perfil: 'professor', disciplinas: ['Redes'], ativo: true };
const admin = { id: 'admin-1', nome: 'Administrador Teste', email: 'admin@example.com', perfil: 'administrador', ativo: true };
const aluno = { id: 'aluno-1', nome: 'Aluno Teste', email: 'aluno@example.com', perfil: 'aluno', curso: 'Inform?tica', turma: 'TI-A', ativo: true };
async function request(url: string, method = 'GET', data?: unknown) {
  return fetch(base + url, { method, redirect: 'manual', headers: { Accept: 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
}
async function login(email = professor.email) {
  cookie = '';
  const res = await request('/auth/login', 'POST', { email, password });
  expect(res.status).toBe(302);
  cookie = res.headers.get('set-cookie')!.split(';')[0]!;
}
beforeAll(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'senac-test-'));
  process.env.DATA_DIR = directory;
  process.env.AVATAR_DIR = path.join(directory, 'avatars');
  const senhaHash = await bcrypt.hash(password, 4);
  await fs.writeFile(path.join(directory, 'usuarios.json'), JSON.stringify([professor, admin, aluno].map(u => ({ ...u, senhaHash }))));
  await fs.writeFile(path.join(directory, 'salas.json'), JSON.stringify([{ id: 'sala-1', nome: 'Laborat?rio Teste', capacidade: 1, recursos: ['projetor'], predio: 'Bloco A', ativa: true }]));
  await fs.writeFile(path.join(directory, 'reservas.json'), '[]');
  await fs.writeFile(path.join(directory, 'aulas-grade.json'), '[]');
  await fs.writeFile(path.join(directory, 'inscricoes-noa.json'), '[]');
  const app = require('../../app').default;
  await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  base = 'http://127.0.0.1:' + (server.address() as any).port;
});
afterAll(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
  if (directory) await fs.rm(directory, { recursive: true, force: true });
  delete process.env.DATA_DIR;
  delete process.env.AVATAR_DIR;
});
test('cadastro n?o permite criar administrador sem autentica??o', async () => {
  cookie = '';
  expect((await request('/auth/registrar', 'POST', { nome: 'Intruso Teste', email: 'intruso@example.com', senha: password, perfil: 'administrador' })).status).toBe(401);
});
test('formulário HTML faz POST na rota publicada e mantém a sessão', async () => {
  const page = await request('/login');
  expect(page.status).toBe(200);
  expect(await page.text()).toContain('action="/auth/login"');
  const response = await fetch(base + '/auth/login', {
    method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: professor.email, password }),
  });
  expect(response.status).toBe(302);
  expect(response.headers.get('location')).toBe('/dashboard');
  const sessionCookie = response.headers.get('set-cookie')!.split(';')[0]!;
  const dashboard = await fetch(base + '/dashboard', {
    redirect: 'manual', headers: { Cookie: sessionCookie },
  });
  expect(dashboard.status).toBe(200);
  expect(await dashboard.text()).toContain(professor.nome);
});
test('login real permite renderizar todas as p?ginas de professor', async () => {
  await login();
  for (const url of ['/dashboard', '/rooms/available', '/rooms/booking', '/bookings/my', '/profile', '/search']) {
    const res = await request(url);
    expect({ url, status: res.status }).toEqual({ url, status: 200 });
    const html = await res.text();
    expect(html).toContain(professor.nome);
    expect((html.match(/id="hamburgerBtn"/g) || []).length).toBe(1);
    expect(html).not.toContain('Prof. Ana Ribeiro');
  }
  expect((await request('/admin')).status).toBe(403);
});
test.each([professor.email, aluno.email])('cadastro exige administrador para %s', async email => {
  await login(email);
  expect((await request('/auth/registrar', 'POST', {})).status).toBe(403);
});
test('perfil persiste telefone e senha e recusa entrada inv?lida', async () => {
  await login();
  expect((await request('/profile', 'PUT', { nome: professor.nome, email: professor.email, telefone: '11999999999' })).status).toBe(200);
  let users = JSON.parse(await fs.readFile(path.join(directory, 'usuarios.json'), 'utf8'));
  expect(users.find((u: any) => u.id === professor.id).telefone).toBe('11999999999');
  expect((await request('/profile', 'PUT', { nome: 'x', email: professor.email })).status).toBe(400);
  expect((await request('/profile', 'PUT', { nome: professor.nome, email: admin.email })).status).toBe(409);
  expect((await request('/profile/senha', 'PUT', { senhaAtual: 'senha-incorreta', novaSenha: 'NovaSenha123!', confirmarSenha: 'NovaSenha123!' })).status).toBe(401);
  expect((await request('/profile/senha', 'PUT', { senhaAtual: password, novaSenha: 'NovaSenha123!' })).status).toBe(200);
  users = JSON.parse(await fs.readFile(path.join(directory, 'usuarios.json'), 'utf8'));
  expect(await bcrypt.compare('NovaSenha123!', users.find((u: any) => u.id === professor.id).senhaHash)).toBe(true);
  // Restore through the real endpoint for other independent scenarios.
  expect((await request('/profile/senha', 'PUT', { senhaAtual: 'NovaSenha123!', novaSenha: password })).status).toBe(200);
});
test('reservas concorrentes impedem conflito e cancelamento persiste', async () => {
  await login();
  const data = { salaId: 'sala-1', data: '2099-06-15', horarioInicio: '08:00', horarioFim: '10:00', disciplina: 'Redes', turma: 'TI-A' };
  expect((await request('/rooms/booking', 'POST', { ...data, salaId: 'inexistente' })).status).toBe(404);
  expect((await request('/rooms/booking', 'POST', { ...data, data: '2000-01-01' })).status).toBe(400);
  const results = await Promise.all([request('/rooms/booking', 'POST', data), request('/rooms/booking', 'POST', data)]);
  expect(results.map(r => r.status).sort()).toEqual([201, 409]);
  const reservas = JSON.parse(await fs.readFile(path.join(directory, 'reservas.json'), 'utf8'));
  expect(reservas).toHaveLength(1);
  const id = reservas[0].id;
  expect((await request('/bookings/' + id + '/cancelar', 'POST', {})).status).toBe(200);
  expect(JSON.parse(await fs.readFile(path.join(directory, 'reservas.json'), 'utf8'))[0].status).toBe('cancelada');
});
test('admin tem painel real e cadastro de sala persiste', async () => {
  await login(admin.email);
  expect((await request('/admin')).status).toBe(200);
  expect((await request('/admin/salas', 'POST', { nome: 'Nova Sala', capacidade: 20, predio: 'Bloco B', recursos: [], ativa: true })).status).toBe(201);
  expect(JSON.parse(await fs.readFile(path.join(directory, 'salas.json'), 'utf8')).some((s: any) => s.nome === 'Nova Sala')).toBe(true);
});
test('aluno pode acessar NOA, mas n?o reservar salas nem administrar', async () => {
  await login(aluno.email);
  expect((await request('/noa')).status).toBe(200);
  expect((await request('/rooms/booking')).status).toBe(403);
  expect((await request('/admin')).status).toBe(403);
  expect((await request('/classes/details?id=inexistente')).status).toBe(404);
  expect((await request('/auth/logout', 'POST', {})).status).toBe(302);
  expect((await request('/profile')).status).toBe(401);
});

test('upload rejeita HTML disfarçado e preserva avatar depois de editar perfil', async () => {
  await login();
  const bad = new FormData();
  bad.append('avatar', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'foto.html');
  expect((await fetch(base + '/profile/foto', { method: 'POST', headers: { Cookie: cookie, Accept: 'application/json' }, body: bad })).status).toBe(415);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1kAAAAASUVORK5CYII=', 'base64');
  const form = new FormData();
  form.append('avatar', new Blob([png], { type: 'image/png' }), 'foto.html');
  const response = await fetch(base + '/profile/foto', { method: 'POST', headers: { Cookie: cookie, Accept: 'application/json' }, body: form });
  expect(response.status).toBe(200);
  const result = await response.json() as any;
  expect(result.fotoUrl).toMatch(/\.png$/);
  const image = await request(result.fotoUrl);
  expect(image.status).toBe(200);
  expect(image.headers.get('x-content-type-options')).toBe('nosniff');
  expect(image.headers.get('content-type')).toContain('image/png');
  await request('/profile', 'PUT', { nome: professor.nome, email: professor.email, telefone: '123456789' });
  const rows = JSON.parse(await fs.readFile(path.join(directory, 'usuarios.json'), 'utf8'));
  expect(rows.find((u: any) => u.id === professor.id).fotoUrl).toBe(result.fotoUrl);
});
test('falha ao salvar foto remove o novo arquivo e preserva o avatar anterior', async () => {
  await login();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1kAAAAASUVORK5CYII=', 'base64');
  const enviarFoto = async (nome: string) => {
    const form = new FormData();
    form.append('avatar', new Blob([png], { type: 'image/png' }), nome);
    return fetch(base + '/profile/foto', { method: 'POST', headers: { Cookie: cookie, Accept: 'application/json' }, body: form });
  };

  const primeiraResposta = await enviarFoto('anterior.png');
  expect(primeiraResposta.status).toBe(200);
  const fotoAnterior = await primeiraResposta.json() as any;
  const avatarDirectory = path.join(directory, 'avatars');
  const arquivoAnterior = path.join(avatarDirectory, path.basename(fotoAnterior.fotoUrl));

  const schoolService = require('../../services/SchoolService');
  const setAvatar = jest.spyOn(schoolService, 'setAvatar').mockRejectedValueOnce(new Error('falha de persistência'));
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    const respostaComFalha = await enviarFoto('nova.png');
    expect(respostaComFalha.status).toBe(500);
    expect(await respostaComFalha.json()).toMatchObject({ success: false });
    expect(await fs.readdir(avatarDirectory)).toEqual([path.basename(arquivoAnterior)]);
    await expect(fs.access(arquivoAnterior)).resolves.toBeUndefined();
  } finally {
    setAvatar.mockRestore();
    consoleError.mockRestore();
  }
});
test('grade impede reserva sobreposta e permite horário adjacente', async () => {
  await login(admin.email);
  const aula = { disciplina: 'Aula de Redes', professorId: professor.id, salaId: 'sala-1', turma: 'TI-A', semestre: '2099.1', diaSemana: 'segunda', horarioInicio: '13:00', horarioFim: '14:00', isNoa: false, ativa: true };
  const created = await request('/admin/aulas-grade', 'POST', aula);
  expect(created.status).toBe(201);
  const record = (await created.json() as any).record;
  const details = await request('/classes/details?id=' + record.id);
  expect(details.status).toBe(200);
  expect(await details.text()).toContain('Aula de Redes');
  await login();
  const data = { salaId: 'sala-1', data: '2099-06-15', horarioInicio: '13:30', horarioFim: '14:30', disciplina: 'Redes', turma: 'TI-A' };
  expect((await request('/rooms/booking', 'POST', data)).status).toBe(409);
  expect((await request('/rooms/booking', 'POST', { ...data, horarioInicio: '14:00', horarioFim: '15:00' })).status).toBe(201);
});
test('NOA respeita vagas com dois alunos concorrentes e cancela inscrição', async () => {
  await login(admin.email);
  expect((await request('/auth/registrar', 'POST', { nome: 'Outro Aluno', email: 'outro@example.com', senha: password, perfil: 'aluno', curso: 'Redes', turma: 'TI-A' })).status).toBe(201);
  const now = new Date();
  const semestre = now.getFullYear() + '.' + (now.getMonth() < 6 ? '1' : '2');
  const response = await request('/admin/aulas-grade', 'POST', { disciplina: 'Oficina NOA', professorId: professor.id, salaId: 'sala-1', turma: 'TI-A', semestre, diaSemana: 'sabado', horarioInicio: '16:00', horarioFim: '17:00', isNoa: true, vagasTotal: 1, ativa: true });
  expect(response.status).toBe(201);
  const id = (await response.json() as any).record.id;
  await login(aluno.email); const cookie1 = cookie;
  await login('outro@example.com'); const cookie2 = cookie;
  const enroll = (value: string) => fetch(base + '/noa/' + id + '/inscrever', { method: 'POST', headers: { Cookie: value, Accept: 'application/json', 'Content-Type': 'application/json' }, body: '{}' });
  const results = await Promise.all([enroll(cookie1), enroll(cookie2)]);
  expect(results.map(r => r.status).sort()).toEqual([201, 409]);
  cookie = results[0]!.status === 201 ? cookie1 : cookie2;
  expect((await request('/noa/' + id + '/inscrever', 'POST', {})).status).toBe(409);
  expect((await request('/noa/' + id + '/cancelar', 'POST', {})).status).toBe(200);
  expect(JSON.parse(await fs.readFile(path.join(directory, 'inscricoes-noa.json'), 'utf8'))).toHaveLength(0);
});
test('usuário desativado perde acesso mesmo com sessão existente', async () => {
  await login(aluno.email); const oldCookie = cookie;
  await login(admin.email);
  expect((await request('/admin/usuarios/' + aluno.id, 'PUT', { ...aluno, ativo: false })).status).toBe(200);
  cookie = oldCookie;
  expect((await request('/noa')).status).toBe(401);
  await login(admin.email);
  expect((await request('/admin/usuarios/' + aluno.id, 'PUT', aluno)).status).toBe(200);
});
test('edição administrativa preserva referências e bloqueia autoexclusão', async () => {
  await login(admin.email);
  expect((await request('/admin/usuarios/' + admin.id, 'DELETE', {})).status).toBe(409);
  expect((await request('/admin/salas/sala-1', 'DELETE', {})).status).toBe(409);
  expect((await request('/auth/registrar', 'POST', { ...professor, senha: password })).status).toBe(409);
  expect((await request('/admin/usuarios/edit')).status).toBe(200);
  expect((await request('/admin/salas/edit?id=sala-1')).status).toBe(200);
  expect((await request('/admin/aulas-grade/edit')).status).toBe(200);
});
