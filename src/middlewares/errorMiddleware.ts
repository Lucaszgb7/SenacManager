import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../services/validation';
export function errorMiddleware(error: any, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) { next(error); return; }
  const status = error instanceof HttpError ? error.status : error.type === 'entity.parse.failed' ? 400 : error.type === 'entity.too.large' ? 413 : 500;
  const message = error instanceof HttpError ? error.message : status === 400 ? 'JSON inválido.' : status === 413 ? 'Requisição muito grande.' : 'Erro interno do servidor. Tente novamente.';
  if (status === 500) console.error('[Erro interno]', error);
  if ((req.headers.accept || '').includes('application/json') || req.is('application/json')) res.status(status).json({ success: false, message });
  else res.status(status).render('errors/error', { status, message });
}
