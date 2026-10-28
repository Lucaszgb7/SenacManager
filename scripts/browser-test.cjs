const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
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
    try {
      browser = await chromium.launch({ channel: 'msedge', headless: true });
    } catch {
      browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
    }
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/login');
    await page.locator('[name=email]').fill('prof@example.com');
    await page.locator('[name=password]').fill('SenhaTeste123!');
    await Promise.all([page.waitForURL('**/dashboard'), page.locator('#submit-btn').click()]);
    assert.equal(await page.locator('#hamburgerBtn').count(), 1);
    assert.match(await page.locator('main').innerText(), /Professor Navegador/);
    await page.goto(base + '/rooms/booking?salaId=s1');
    assert.equal(await page.locator('#book-sala').inputValue(), 's1');
    assert.equal(await page.locator('[name=salaChoice][value=s1]').isChecked(), true);
    await page.locator('#book-sala').selectOption('');
    await page.locator('[name=salaChoice][value=s1]').check();
    assert.equal(await page.locator('#book-sala').inputValue(), 's1');
    const form = page.locator('[data-api-form]');
    await form.locator('[name=salaId]').selectOption('s1');
    await form.locator('[name=data]').fill('2099-06-15');
    await form.locator('[name=horarioInicio]').fill('08:00');
    await form.locator('[name=horarioFim]').fill('09:00');
    await form.locator('[name=disciplina]').fill('Redes');
    await form.locator('[name=turma]').fill('TI-A');
    await Promise.all([page.waitForURL('**/bookings/my'), form.locator('[type=submit]').click()]);
    assert.match(await page.locator('main').innerText(), /Sala Navegador/);
    const cancelButton = page.getByRole('button', { name: 'Cancelar reserva', exact: true });
    let cancelRequests = 0;
    await page.route('**/bookings/*/cancelar', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      cancelRequests++;
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Falha temporária no cancelamento.' }) });
    });
    page.once('dialog', dialog => dialog.dismiss());
    await cancelButton.click();
    assert.equal(cancelRequests, 0, 'dispensar a confirmação não envia a ação');
    page.once('dialog', dialog => dialog.accept());
    await cancelButton.click();
    const cancelFeedback = cancelButton.locator('xpath=..').locator('[data-feedback]');
    await cancelFeedback.waitFor({ state: 'visible' });
    assert.equal(await cancelFeedback.getAttribute('role'), 'alert');
    assert.equal(await cancelButton.isDisabled(), false);
    assert.equal(await cancelButton.innerText(), 'Cancelar reserva');
    await page.unroute('**/bookings/*/cancelar');
    page.once('dialog', dialog => dialog.accept());
    await Promise.all([page.waitForEvent('load'), cancelButton.click()]);
    assert.equal(cancelRequests, 1, 'a falha da primeira tentativa é seguida por um retry no endpoint');
    await page.locator('[data-tab=historico]').click();
    assert.equal(await page.locator('[data-panel=historico]').isVisible(), true);
    assert.match(await page.locator('[data-panel=historico]').innerText(), /Cancelada/);
    await page.goto(base + '/profile');
    const profileForm = page.locator('form[action="/profile"]');
    const profileSubmit = profileForm.locator('[type=submit]');
    await profileForm.locator('[name=email]').fill('email-invalido');
    await profileSubmit.click();
    assert.equal(await profileForm.getAttribute('aria-busy'), null, 'validação nativa não ativa carregamento');
    assert.equal(await profileSubmit.innerText(), 'Salvar dados');
    await profileForm.locator('[name=email]').fill('prof@example.com');
    await profileForm.locator('[name=telefone]').fill('11999999999');
    let profileRequests = 0;
    let releaseProfileResponse;
    const profileResponseGate = new Promise(resolve => { releaseProfileResponse = resolve; });
    const profileRequestStarted = page.waitForRequest(request => request.url().endsWith('/profile') && request.method() === 'PUT');
    await page.route('**/profile', async route => {
      if (route.request().method() !== 'PUT') return route.continue();
      profileRequests++;
      await profileResponseGate;
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Falha temporária ao salvar o perfil.' }) });
    });
    await profileSubmit.click();
    await profileRequestStarted;
    assert.equal(await profileSubmit.isDisabled(), true);
    assert.equal(await profileSubmit.innerText(), 'Salvando...');
    assert.equal(await profileForm.getAttribute('aria-busy'), 'true');
    await profileForm.dispatchEvent('submit', { bubbles: true, cancelable: true });
    releaseProfileResponse();
    const profileFeedback = profileForm.locator('[data-feedback]');
    await profileFeedback.waitFor({ state: 'visible' });
    assert.equal(profileRequests, 1, 'submissões repetidas durante uma requisição geram uma só chamada');
    assert.equal(await profileFeedback.getAttribute('role'), 'alert');
    assert.match(await profileFeedback.innerText(), /Falha temporária/);
    assert.equal(await profileSubmit.isDisabled(), false);
    assert.equal(await profileSubmit.innerText(), 'Salvar dados');
    assert.equal(await profileForm.getAttribute('aria-busy'), null);
    await page.unroute('**/profile');
    await page.setViewportSize({ width: 390, height: 844 });
    const pageWidthBeforeFeedback = await page.evaluate(() => document.documentElement.scrollWidth);
    await profileFeedback.evaluate(el => { el.textContent = 'Erro: ' + 'mensagem'.repeat(50); el.hidden = false; });
    assert.equal(await profileFeedback.isVisible(), true);
    const overflow = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      elements: Array.from(document.querySelectorAll('body *')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.right > window.innerWidth + 1 || rect.left < -1;
      }).slice(0, 8).map(el => ({ tag: el.tagName, className: typeof el.className === 'string' ? el.className : '', right: Math.round(el.getBoundingClientRect().right), width: Math.round(el.getBoundingClientRect().width) })),
    }));
    assert.ok(overflow.document <= pageWidthBeforeFeedback && await profileFeedback.evaluate(el => el.scrollWidth <= el.clientWidth), 'mensagem longa não acrescenta rolagem horizontal: ' + JSON.stringify({ ...overflow, pageWidthBeforeFeedback }));
    await profileFeedback.evaluate(el => { el.hidden = true; });
    await profileForm.locator('[name=telefone]').focus();
    const profileUpdatePromise = page.waitForResponse(response => response.url().endsWith('/profile') && response.request().method() === 'PUT');
    await Promise.all([page.waitForEvent('load'), profileForm.locator('[name=telefone]').press('Enter')]);
    assert.equal((await profileUpdatePromise).status(), 200);
    assert.equal(await page.locator('[name=telefone]').inputValue(), '11999999999');
    const passwordForm = page.locator('form[action="/profile/senha"]');
    await passwordForm.locator('[name=senhaAtual]').fill('SenhaTeste123!');
    await passwordForm.locator('[name=novaSenha]').fill('SenhaNova123!');
    await passwordForm.locator('[name=confirmarSenha]').fill('SenhaNova123!');
    const passwordResponsePromise = page.waitForResponse(response => response.url().endsWith('/profile/senha'));
    await passwordForm.locator('[type=submit]').click();
    const passwordResponse = await passwordResponsePromise;
    assert.equal(passwordResponse.status(), 200, await passwordResponse.text());
    const passwordFeedback = passwordForm.locator('[data-feedback]');
    await passwordFeedback.waitFor({ state: 'visible' });
    assert.equal(await passwordFeedback.getAttribute('role'), 'status');
    assert.match(await passwordFeedback.innerText(), /Senha alterada/);
    assert.equal(await passwordForm.locator('[name=senhaAtual]').inputValue(), '', 'o formulário mantém o reset configurado');
    await page.locator('#hamburgerBtn').click();
    assert.equal(await page.locator('#hamburgerBtn').getAttribute('aria-expanded'), 'true');
    await page.locator('#sidebarBackdrop').click({ position: { x: 380, y: 400 } });
    await page.locator('#avatarTrigger').click();
    assert.equal(await page.locator('#avatarDropdown').isVisible(), true);
    await Promise.all([page.waitForURL('**/login'), page.locator('#avatarDropdown').getByRole('button', { name: 'Sair', exact: true }).click()]);
    await page.locator('[name=email]').fill('admin@example.com');
    await page.locator('[name=password]').fill('SenhaTeste123!');
    await Promise.all([page.waitForURL('**/dashboard'), page.locator('#submit-btn').click()]);
    await page.goto(base + '/admin/salas/edit');
    await page.locator('[name=nome]').fill('Sala Criada na Interface');
    await page.locator('[name=predio]').fill('Bloco B');
    await page.locator('[name=capacidade]').fill('30');
    await Promise.all([page.waitForURL('**/admin'), page.getByRole('button', { name: 'Salvar', exact: true }).click()]);
    assert.match(await page.locator('[data-panel=salas]').innerText(), /Sala Criada na Interface/);
    const deleteAction = page.locator('button[data-api-action][data-method="DELETE"]').first();
    let releaseDeleteResponse;
    const deleteResponseGate = new Promise(resolve => { releaseDeleteResponse = resolve; });
    const deleteRequestStarted = page.waitForRequest(request => request.url().includes('/admin/salas/') && request.method() === 'DELETE');
    await page.route('**/admin/salas/*', async route => {
      if (route.request().method() !== 'DELETE') return route.continue();
      await deleteResponseGate;
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Falha temporária ao excluir.' }) });
    });
    page.once('dialog', dialog => dialog.accept());
    await deleteAction.click();
    await deleteRequestStarted;
    assert.equal(await deleteAction.innerText(), 'Processando...');
    assert.equal(await deleteAction.evaluate(el => getComputedStyle(el, '::before').content), '""', 'ação com estilo de link exibe indicador de carregamento');
    releaseDeleteResponse();
    const deleteFeedback = deleteAction.locator('xpath=..').locator('[data-feedback]');
    await deleteFeedback.waitFor({ state: 'visible' });
    assert.equal(await deleteAction.innerText(), 'Excluir');
    assert.equal(await deleteAction.isDisabled(), false);
    assert.deepEqual(errors, []);
    console.log('Browser OK: login, reserva, cancelamento, sucesso/erro de formulários e ações, retry, abas, menu mobile, logout e cadastro administrativo.');
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    await fs.rm(dir, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
