import session, { MemoryStore } from 'express-session';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function isHttps(req: Request): boolean {
  if (req.secure) return true;
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.toLowerCase();
  if (proto && proto.split(',')[0]?.trim() === 'https') return true;
  if ((req.headers['x-forwarded-protocol'] as string | undefined)?.toLowerCase() === 'https') return true;
  if ((req.headers['x-url-scheme'] as string | undefined)?.toLowerCase() === 'https') return true;
  if ((req.headers['x-forwarded-ssl'] as string | undefined)?.toLowerCase() === 'on') return true;

  const host = (req.headers.host || req.headers['x-forwarded-host'] || '') as string;
  if (host.includes('.app.github.dev') || host.includes('.githubpreview.dev')) {
    return true;
  }

  if (process.env.CODESPACES === 'true' || process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN) {
    return true;
  }

  return false;
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!secret || secret.trim() === '' || secret === 'senacmanager-dev-secret-troque-em-producao') {
      throw new Error('SESSION_SECRET válida é obrigatória em ambiente de produção.');
    }
    if (secret.length < 16) {
      throw new Error('SESSION_SECRET em produção deve ter pelo menos 16 caracteres.');
    }
    return secret;
  }

  return secret && secret.trim() !== '' ? secret : 'senacmanager-dev-secret-troque-em-producao';
}

const sharedStore = new MemoryStore();

function createSessionHandler(isSecure: boolean): RequestHandler {
  return session({
    secret: getSessionSecret(),
    store: sharedStore,
    resave: false,
    saveUninitialized: false,
    name: 'senac.sid',
    proxy: isSecure,
    cookie: {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    },
  });
}

let httpsHandler: RequestHandler | null = null;
let httpHandler: RequestHandler | null = null;

export function getSessionHandler(isSecure: boolean): RequestHandler {
  if (isSecure) {
    if (!httpsHandler) httpsHandler = createSessionHandler(true);
    return httpsHandler;
  }
  if (!httpHandler) httpHandler = createSessionHandler(false);
  return httpHandler;
}

export function resetSessionHandlersForTesting(): void {
  httpsHandler = null;
  httpHandler = null;
}

const sessionMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const secure = isHttps(req);
  const handler = getSessionHandler(secure);
  handler(req, res, next);
};

export default sessionMiddleware;
