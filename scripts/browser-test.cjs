const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { chromium } = require('@playwright/test');

(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'senac-browser-'));
  process.env.DATA_DIR = dir;
  process.env.AVATAR_DIR = path.join(dir, 'avatars');
  let server, browser;
  try {
    const senhaHash = await bcrypt.hash('SenhaTeste123!', 4);
    await fs.writeFile(path.join(dir, 'usuarios.json'), JSON.stringify([
      { id: 'p1', nome: 'Professor Navegador', email: 'prof@example.com', perfil: 'professor', disciplinas: ['Redes'], senhaHash },
      { id: 'a1', nome: 'Admin Navegador', email: 'admin@example.com', perfil: 'administrador', senhaHash },
    ]));
    await fs.writeFile(path.join(dir, 'salas.json'), JSON.stringify([{ id: 's1', nome: 'Sala Navegador', predio: 'Bloco A', capacidade: 20, recursos: [], ativa: true }]));
    for (const name of ['reservas', 'aulas-grade', 'inscricoes-noa']) await fs.writeFile(path.join(dir, name + '.json'), '[]');
    const app = require('../dist/app').default;
    await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
    const base = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/login');
    await page.locator('[name=email]').fill('prof@example.com');
    await page.locator('[name=password]').fill('SenhaTeste123!');
    await Promise.all([page.waitForURL('**/dashboard'), page.locator('#submit-btn').click()]);
    assert.equal(await page.locator('#hamburgerBtn').count(), 1);
    assert.match(await page.locator('main').innerText(), /Professor Navegador/);
    await page.goto(base + '/rooms/booking');
    const form = page.locator('[data-api-form]');
    await form.locator('[name=salaId]').selectOption('s1');
    await form.locator('[name=data]').fill('2099-06-15');
    await form.locator('[name=horarioInicio]').fill('08:00');
    await form.locator('[name=horarioFim]').fill('09:00');
    await form.locator('[name=disciplina]').fill('Redes');
    await form.locator('[name=turma]').fill('TI-A');
    await Promise.all([page.waitForURL('**/bookings/my'), form.locator('[type=submit]').click()]);
    assert.match(await page.locator('main').innerText(), /Sala Navegador/);
    page.on('dialog', dialog => dialog.accept());
    await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Cancelar reserva', exact: true }).click()]);
    await page.locator('[data-tab=historico]').click();
    assert.equal(await page.locator('[data-panel=historico]').isVisible(), true);
    assert.match(await page.locator('[data-panel=historico]').innerText(), /Cancelada/);
    await page.goto(base + '/profile');
    await page.locator('[name=telefone]').fill('11999999999');
    await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Salvar dados', exact: true }).click()]);
    assert.equal(await page.locator('[name=telefone]').inputValue(), '11999999999');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#hamburgerBtn').click();
    assert.equal(await page.locator('#hamburgerBtn').getAttribute('aria-expanded'), 'true');
    await page.locator('#sidebarBackdrop').click({ position: { x: 380, y: 400 } });
    await page.locator('#avatarTrigger').click();
    assert.equal(await page.locator('#avatarDropdown').isVisible(), true);
    await Promise.all([page.waitForURL('**/login'), page.getByRole('button', { name: 'Sair', exact: true }).click()]);
    await page.locator('[name=email]').fill('admin@example.com');
    await page.locator('[name=password]').fill('SenhaTeste123!');
    await Promise.all([page.waitForURL('**/dashboard'), page.locator('#submit-btn').click()]);
    await page.goto(base + '/admin/salas/edit');
    await page.locator('[name=nome]').fill('Sala Criada na Interface');
    await page.locator('[name=predio]').fill('Bloco B');
    await page.locator('[name=capacidade]').fill('30');
    await Promise.all([page.waitForURL('**/admin'), page.getByRole('button', { name: 'Salvar', exact: true }).click()]);
    assert.match(await page.locator('[data-panel=salas]').innerText(), /Sala Criada na Interface/);
    assert.deepEqual(errors, []);
    console.log('Browser OK: login, reserva, cancelamento, abas, perfil, menu mobile, logout e cadastro administrativo.');
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    await fs.rm(dir, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
