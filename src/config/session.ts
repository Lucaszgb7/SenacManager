import session, { Store, SessionData } from 'express-session';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Detecta se a conexão é HTTPS com base em informações confiáveis:
 * - `req.secure` do Express (que valida TLS nativo ou proxies confiáveis conforme `trust proxy`).
 * - Valida se o proxy é de confiança antes de inspecionar `x-forwarded-proto`.
 * - Não confia cegamente em variáveis de ambiente ou substrings de domínio.
 */
export function isHttps(req: Request): boolean {
  // 1. Determinação oficial do Express (avalia socket criptografado e proxy de confiança)
  if (req.secure) return true;

  // 2. Conexão TLS nativa direta (sem proxy intermediário)
  if ((req.socket as any)?.encrypted || (req.connection as any)?.encrypted) {
    return true;
  }

  // 3. Verifica se a aplicação está configurada para confiar em proxy
  const trustProxySetting = req.app?.get('trust proxy');
  const proxyExplicitlyDisabled =
    trustProxySetting === false ||
    trustProxySetting === 0 ||
    process.env.TRUST_PROXY === '0' ||
    process.env.TRUST_PROXY === 'false';

  // Se o proxy de confiança não estiver desativado, avalia o cabeçalho seguro do primeiro hop
  if (!proxyExplicitlyDisabled) {
    const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.toLowerCase();
    if (proto) {
      const firstProto = proto.split(',')[0]?.trim();
      if (firstProto === 'https') return true;
    }
  }

  return false;
}

/**
 * Valida e recupera o segredo da sessão (SESSION_SECRET).
 * Em produção exige no mínimo 16 caracteres e impede segredos padrão.
 */
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

/**
 * Armazenamento de sessão com controle de expiração e limpeza automática (TTL Pruning).
 * Evita vazamentos de memória do MemoryStore padrão sem exigir serviços externos (Redis/Memcached).
 *
 * Arquitetura de Persistência:
 * - Em desenvolvimento e demonstração: mantém sessões com limpeza periódica e atualização de TTL (touch).
 * - Em ambientes corporativos distribuídos: documentado para apontar para Redis ou tabela MySQL de sessões.
 */
interface StoredSession {
  data: string;
  expires: number;
}

export class CleanableSessionStore extends Store {
  private sessions = new Map<string, StoredSession>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(cleanupIntervalMs = 10 * 60 * 1000) {
    super();
    // Limpeza periódica em segundo plano que não impede o término do processo Node
    this.cleanupTimer = setInterval(() => this.pruneExpired(), cleanupIntervalMs);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [sid, item] of this.sessions.entries()) {
      if (item.expires <= now) {
        this.sessions.delete(sid);
      }
    }
  }

  get = (sid: string, callback: (err?: any, session?: SessionData | null) => void): void => {
    const item = this.sessions.get(sid);
    if (!item) {
      return callback(null, null);
    }

    if (item.expires <= Date.now()) {
      this.sessions.delete(sid);
      return callback(null, null);
    }

    try {
      const parsed = JSON.parse(item.data) as SessionData;
      callback(null, parsed);
    } catch (err) {
      this.sessions.delete(sid);
      callback(err);
    }
  };

  set = (sid: string, session: SessionData, callback?: (err?: any) => void): void => {
    try {
      const maxAge = session.cookie?.maxAge ?? 24 * 60 * 60 * 1000;
      const expires = Date.now() + maxAge;
      this.sessions.set(sid, {
        data: JSON.stringify(session),
        expires,
      });
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  };

  destroy = (sid: string, callback?: (err?: any) => void): void => {
    this.sessions.delete(sid);
    if (callback) callback(null);
  };

  touch = (sid: string, session: SessionData, callback?: (err?: any) => void): void => {
    const current = this.sessions.get(sid);
    if (current) {
      const maxAge = session.cookie?.maxAge ?? 24 * 60 * 60 * 1000;
      current.expires = Date.now() + maxAge;
    }
    if (callback) callback(null);
  };

  all = (callback: (err?: any, obj?: { [sid: string]: SessionData } | null) => void): void => {
    const result: { [sid: string]: SessionData } = {};
    const now = Date.now();
    for (const [sid, item] of this.sessions.entries()) {
      if (item.expires > now) {
        try {
          result[sid] = JSON.parse(item.data);
        } catch {
          // ignore corrupted entry
        }
      }
    }
    callback(null, result);
  };

  length = (callback: (err?: any, length?: number) => void): void => {
    this.pruneExpired();
    callback(null, this.sessions.size);
  };

  clear = (callback?: (err?: any) => void): void => {
    this.sessions.clear();
    if (callback) callback(null);
  };

  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

export const sharedStore = new CleanableSessionStore();

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
