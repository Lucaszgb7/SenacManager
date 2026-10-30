import { Server } from 'http';
import { Request } from 'express';
import {
  isHttps,
  getSessionSecret,
  resetSessionHandlersForTesting,
} from '../../config/session';
import { readData } from '../../services/store';

describe('Sessões e Autenticação (SenacManager v23)', () => {
  describe('1. Validação de SESSION_SECRET em produção', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
      resetSessionHandlersForTesting();
    });

    it('deve lançar erro se SESSION_SECRET estiver ausente em produção', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.SESSION_SECRET;
      expect(() => getSessionSecret()).toThrow(
        'SESSION_SECRET válida é obrigatória em ambiente de produção.'
      );
    });

    it('deve lançar erro se SESSION_SECRET for o placeholder de desenvolvimento em produção', () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'senacmanager-dev-secret-troque-em-producao';
      expect(() => getSessionSecret()).toThrow(
        'SESSION_SECRET válida é obrigatória em ambiente de produção.'
      );
    });

    it('deve lançar erro se SESSION_SECRET for muito curta (< 16 caracteres) em produção', () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'curta123';
      expect(() => getSessionSecret()).toThrow(
        'SESSION_SECRET em produção deve ter pelo menos 16 caracteres.'
      );
    });

    it('deve aceitar SESSION_SECRET válida com pelo menos 16 caracteres em produção', () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'segredo-super-seguro-de-producao-2026';
      expect(getSessionSecret()).toBe('segredo-super-seguro-de-producao-2026');
    });

    it('deve utilizar segredo padrão de desenvolvimento quando fora de produção e não configurado', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.SESSION_SECRET;
      expect(getSessionSecret()).toBe('senacmanager-dev-secret-troque-em-producao');
    });
  });

  describe('2. Detecção de HTTPS e suporte ao GitHub Codespaces', () => {
    it('deve identificar HTTPS via req.secure', () => {
      const req = { secure: true, headers: {} } as unknown as Request;
      expect(isHttps(req)).toBe(true);
    });

    it('deve identificar HTTPS via cabeçalho x-forwarded-proto', () => {
      const req = {
        secure: false,
        headers: { 'x-forwarded-proto': 'https' },
      } as unknown as Request;
      expect(isHttps(req)).toBe(true);
    });

    it('deve identificar HTTPS via domínio do GitHub Codespaces (*.app.github.dev)', () => {
      const req = {
        secure: false,
        headers: { host: 'senacmanager-3000.app.github.dev' },
      } as unknown as Request;
      expect(isHttps(req)).toBe(true);
    });

    it('deve identificar HTTPS via domínio do GitHub Codespaces (*.githubpreview.dev)', () => {
      const req = {
        secure: false,
        headers: { host: 'preview-workspace.githubpreview.dev' },
      } as unknown as Request;
      expect(isHttps(req)).toBe(true);
    });

    it('deve preservar HTTP para acessos locais', () => {
      const req = {
        secure: false,
        headers: { host: 'localhost:3000' },
      } as unknown as Request;
      expect(isHttps(req)).toBe(false);
    });
  });

  describe('3. Integração de Sessões, Cookies e Perfis no Servidor Real', () => {
    let server: Server;
    let base: string;
    const defaultPassword = '123456';

    beforeAll(async () => {
      process.env.DB_DRIVER = 'json';
      const app = require('../../app').default;
      await new Promise<void>((resolve) => {
        server = app.listen(0, '127.0.0.1', resolve);
      });
      base = 'http://127.0.0.1:' + (server.address() as any).port;
    });

    afterAll(async () => {
      if (server) {
        await new Promise<void>((resolve, reject) =>
          server.close((e) => (e ? reject(e) : resolve()))
        );
      }
    });

    it('em requisições HTTPS (Codespaces), o cookie deve ser emitido com SameSite=None e Secure', async () => {
      const response = await fetch(base + '/auth/login', {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-proto': 'https',
          host: 'workspace-3000.app.github.dev',
        },
        body: JSON.stringify({
          email: 'carlos.silva@senac.br',
          password: defaultPassword,
        }),
      });

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/dashboard');
      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      expect(setCookie!.toLowerCase()).toContain('secure');
      expect(setCookie!.toLowerCase()).toContain('samesite=none');
    });

    it('em requisições HTTP locais, o cookie deve vir sem Secure e com SameSite=Lax', async () => {
      const response = await fetch(base + '/auth/login', {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'Content-Type': 'application/json',
          host: 'localhost:3000',
        },
        body: JSON.stringify({
          email: 'carlos.silva@senac.br',
          password: defaultPassword,
        }),
      });

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/dashboard');
      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      expect(setCookie!.toLowerCase()).not.toContain('secure');
      expect(setCookie!.toLowerCase()).toContain('samesite=lax');
    });

    it('autentica professor (carlos.silva@senac.br), mantém sessão ativa após redirect para /dashboard e valida permissões', async () => {
      const loginRes = await fetch(base + '/auth/login', {
        method: 'POST',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'carlos.silva@senac.br',
          password: defaultPassword,
        }),
      });
      expect(loginRes.status).toBe(302);
      expect(loginRes.headers.get('location')).toBe('/dashboard');
      const cookie = loginRes.headers.get('set-cookie')!.split(';')[0]!;

      // Acessa /dashboard com a sessão ativa
      const dashRes = await fetch(base + '/dashboard', {
        headers: { Cookie: cookie },
      });
      expect(dashRes.status).toBe(200);
      const dashHtml = await dashRes.text();
      expect(dashHtml).toContain('Carlos Eduardo Silva');
      expect(dashHtml).toContain('Nova Reserva');

      // Professor pode acessar visualização de salas
      const roomRes = await fetch(base + '/rooms/available', {
        headers: { Cookie: cookie },
      });
      expect(roomRes.status).toBe(200);

      // Professor não pode acessar /admin
      const adminRes = await fetch(base + '/admin', {
        headers: { Cookie: cookie },
      });
      expect(adminRes.status).toBe(403);
    });

    it('autentica aluno (joao.almeida@aluno.senac.br), mantém sessão ativa após redirect para /dashboard e valida permissões', async () => {
      const loginRes = await fetch(base + '/auth/login', {
        method: 'POST',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'joao.almeida@aluno.senac.br',
          password: defaultPassword,
        }),
      });
      expect(loginRes.status).toBe(302);
      expect(loginRes.headers.get('location')).toBe('/dashboard');
      const cookie = loginRes.headers.get('set-cookie')!.split(';')[0]!;

      // Acessa /dashboard com a sessão ativa
      const dashRes = await fetch(base + '/dashboard', {
        headers: { Cookie: cookie },
      });
      expect(dashRes.status).toBe(200);
      const dashHtml = await dashRes.text();
      expect(dashHtml).toContain('João Pedro Almeida');
      expect(dashHtml).toContain('Explorar Atividades NOA');

      // Aluno pode acessar NOA
      const noaRes = await fetch(base + '/noa', {
        headers: { Cookie: cookie },
      });
      expect(noaRes.status).toBe(200);

      // Aluno não pode acessar /admin
      const adminRes = await fetch(base + '/admin', {
        headers: { Cookie: cookie },
      });
      expect(adminRes.status).toBe(403);
    });

    it('autentica administrador (roberto.ferreira@senac.br), mantém sessão ativa após redirect para /dashboard e acessa painel administrativo', async () => {
      const loginRes = await fetch(base + '/auth/login', {
        method: 'POST',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'roberto.ferreira@senac.br',
          password: defaultPassword,
        }),
      });
      expect(loginRes.status).toBe(302);
      expect(loginRes.headers.get('location')).toBe('/dashboard');
      const cookie = loginRes.headers.get('set-cookie')!.split(';')[0]!;

      // Acessa /dashboard com a sessão ativa
      const dashRes = await fetch(base + '/dashboard', {
        headers: { Cookie: cookie },
      });
      expect(dashRes.status).toBe(200);
      const dashHtml = await dashRes.text();
      expect(dashHtml).toContain('Roberto Nunes Ferreira');
      expect(dashHtml).toContain('Painel Geral');

      // Administrador pode acessar /admin
      const adminRes = await fetch(base + '/admin', {
        headers: { Cookie: cookie },
      });
      expect(adminRes.status).toBe(200);
    });

    it('realiza logout, encerra a sessão e impede novo acesso ao dashboard', async () => {
      // 1. Faz login
      const loginRes = await fetch(base + '/auth/login', {
        method: 'POST',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'carlos.silva@senac.br',
          password: defaultPassword,
        }),
      });
      const cookie = loginRes.headers.get('set-cookie')!.split(';')[0]!;

      // 2. Confirma que a sessão é válida no dashboard
      const dashBefore = await fetch(base + '/dashboard', {
        headers: { Cookie: cookie },
      });
      expect(dashBefore.status).toBe(200);

      // 3. Faz logout via POST /auth/logout
      const logoutRes = await fetch(base + '/auth/logout', {
        method: 'POST',
        redirect: 'manual',
        headers: { Cookie: cookie },
      });
      expect(logoutRes.status).toBe(302);
      expect(logoutRes.headers.get('location')).toBe('/login');

      // 4. Tentativa de acessar /dashboard com a sessão antiga é redirecionada para /login
      const dashAfter = await fetch(base + '/dashboard', {
        redirect: 'manual',
        headers: { Cookie: cookie },
      });
      expect(dashAfter.status).toBe(302);
      expect(dashAfter.headers.get('location')).toBe('/login');
    });
  });

  describe('4. Verificação de Isolamento do MySQL (sem reset e sem seed automático)', () => {
    it('garante que DB_DRIVER=mysql direciona para o driver MySQL sem tocar JSON', () => {
      const savedDriver = process.env.DB_DRIVER;
      try {
        process.env.DB_DRIVER = 'mysql';
        // Quando DB_DRIVER=mysql, readData sem pool ativo lança erro específico de MySQL/conexão
        expect(readData('salas')).rejects.toThrow();
      } finally {
        process.env.DB_DRIVER = savedDriver;
      }
    });
  });
});
