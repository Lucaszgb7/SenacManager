import session from 'express-session';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

const production = process.env.NODE_ENV === 'production';
if (production && !process.env.SESSION_SECRET) {
  console.warn('[Session] SESSION_SECRET not set, using default development secret.');
}

const rawSession = session({
  secret: process.env.SESSION_SECRET || 'senacmanager-dev-secret-troque-em-producao',
  resave: false,
  saveUninitialized: false,
  name: 'senac.sid',
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
});

const sessionMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const isHttps = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');

  rawSession(req, res, () => {
    if (req.session && req.session.cookie) {
      if (isHttps) {
        req.session.cookie.secure = true;
        req.session.cookie.sameSite = 'none';
      } else {
        req.session.cookie.secure = false;
        req.session.cookie.sameSite = 'lax';
      }
    }
    next();
  });
};

export default sessionMiddleware;
