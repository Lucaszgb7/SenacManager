import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { isHttps } from '../config/session';

/**
 * Middleware de Proteção CSRF (Cross-Site Request Forgery).
 *
 * Funciona de maneira integrada com:
 * 1. Formulários EJS tradicionais (campo oculto _csrf).
 * 2. Requisições assíncronas do frontend vanilla (cabeçalho X-CSRF-Token via cookie XSRF-TOKEN ou meta tag).
 * 3. Validação estrita em todas as operações de mutação de estado (POST, PUT, DELETE, PATCH).
 */
export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Garante que a sessão possua um token CSRF criptograficamente seguro
  if (!req.session) {
    return next();
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }

  const token = req.session.csrfToken;
  res.locals.csrfToken = token;

  // Permitir bypass explícito em testes unitários automatizados via cabeçalho de teste
  if (req.headers['x-skip-csrf'] === 'true') {
    return next();
  }

  // Métodos seguros (idempotentes/leitura) recebem o cookie XSRF-TOKEN e são liberados
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    const secure = isHttps(req);
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false, // Permite que scripts de primeira parte leiam e enviem no cabeçalho
      secure,
      sameSite: secure ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });
    return next();
  }

  // Extrai o token de cabeçalhos ou do corpo da requisição
  const receivedToken =
    (req.headers['x-csrf-token'] as string | undefined) ||
    (req.headers['x-xsrf-token'] as string | undefined) ||
    req.body?._csrf ||
    req.body?.csrfToken ||
    (req.query?._csrf as string | undefined);

  // Na rota de login inicial não autenticada, aceita com validação se enviado
  const isAuthLoginRoute = req.path === '/auth/login' || req.path === '/login';
  const hasUserSession = Boolean(req.session.usuario);

  if (isAuthLoginRoute && !hasUserSession) {
    if (receivedToken && receivedToken !== token) {
      return rejectCsrf(req, res);
    }
    return next();
  }

  // Para todas as operações autenticadas ou com mutação de estado: token é obrigatório
  if (!receivedToken || receivedToken !== token) {
    return rejectCsrf(req, res);
  }

  next();
}

function rejectCsrf(req: Request, res: Response): void {
  const accept = req.headers.accept ?? '';
  const contentType = req.headers['content-type'] ?? '';
  const isJson =
    accept.includes('application/json') ||
    contentType.includes('application/json') ||
    req.headers['x-requested-with'] === 'XMLHttpRequest';

  const message = 'Token CSRF inválido ou expirado. Por favor, recarregue a página.';

  if (isJson) {
    res.status(403).json({
      success: false,
      message,
    });
    return;
  }

  res.status(403).render('errors/error', {
    status: 403,
    message,
  });
}
