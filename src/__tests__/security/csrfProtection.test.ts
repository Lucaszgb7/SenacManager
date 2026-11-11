import { Server } from 'http';
import app from '../../app';

describe('Segurança — Proteção CSRF (Cross-Site Request Forgery)', () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  it('deve emitir cookie XSRF-TOKEN e renderizar meta tag em requisições GET', async () => {
    const res = await fetch(`${base}/login`);
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain('name="csrf-token"');

    const setCookies = typeof (res.headers as any).getSetCookie === 'function'
      ? (res.headers as any).getSetCookie()
      : [res.headers.get('set-cookie') || ''];

    const hasXsrfCookie = setCookies.some((sc: string) => sc.startsWith('XSRF-TOKEN='));
    expect(hasXsrfCookie).toBe(true);
  });

  it('deve rejeitar com 403 requisições autenticadas sem token CSRF', async () => {
    // 1. Obtém sessão
    const getRes = await fetch(`${base}/login`);
    const cookie = getRes.headers.get('set-cookie')!.split(';')[0]!;

    // 2. Faz POST protegido sem enviar token CSRF nem cabeçalho de bypass
    const postRes = await fetch(`${base}/profile`, {
      method: 'PUT',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ nome: 'Nome Teste' }),
    });

    expect(postRes.status).toBe(403);
    const body = await postRes.json() as any;
    expect(body.success).toBe(false);
    expect(body.message).toContain('Token CSRF');
  });

  it('deve rejeitar com 403 requisições autenticadas com token CSRF inválido', async () => {
    const getRes = await fetch(`${base}/login`);
    const cookie = getRes.headers.get('set-cookie')!.split(';')[0]!;

    const postRes = await fetch(`${base}/profile`, {
      method: 'PUT',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRF-Token': 'token-invalido-ou-forjado',
      },
      body: JSON.stringify({ nome: 'Nome Teste' }),
    });

    expect(postRes.status).toBe(403);
  });

  it('deve aceitar requisição quando token CSRF válido for fornecido via cabeçalho X-CSRF-Token', async () => {
    // 1. Autentica professor
    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'carlos.silva@senac.br',
        password: 'senha_invalida_proposital',
      }),
    });

    // 2. Acessa dashboard para extrair o token CSRF oficial da sessão
    const sessionCookie = loginRes.headers.get('set-cookie')!.split(';')[0]!;
    const dashRes = await fetch(`${base}/login`, {
      headers: { Cookie: sessionCookie },
    });

    const setCookies = typeof (dashRes.headers as any).getSetCookie === 'function'
      ? (dashRes.headers as any).getSetCookie()
      : [dashRes.headers.get('set-cookie') || ''];

    let xsrfToken = '';
    for (const sc of setCookies) {
      if (sc.startsWith('XSRF-TOKEN=')) {
        xsrfToken = decodeURIComponent(sc.split(';')[0]!.slice('XSRF-TOKEN='.length));
      }
    }

    expect(xsrfToken).toBeTruthy();

    // 3. Testa logout passando o X-CSRF-Token correto
    const logoutRes = await fetch(`${base}/auth/logout`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        Cookie: sessionCookie,
        'X-CSRF-Token': xsrfToken,
      },
    });

    expect(logoutRes.status).toBe(302);
  });
});
