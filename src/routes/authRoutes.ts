// src/routes/authRoutes.ts
import { Router, Request, Response } from 'express';
import { autenticado } from '../middlewares/authMiddleware';
import { permitirPerfis } from '../middlewares/perfilMiddleware';
import AuthController from '../controllers/AuthController';

const authRoutes = Router();


authRoutes.get('/login', (_req: Request, res: Response) => {
  res.render('auth/login', { error: null });
});

/**
 * POST /auth/login
 * Autentica o usuário e cria a sessão.
 */
authRoutes.post(
  '/auth/login',
  AuthController.login.bind(AuthController)
);

authRoutes.post(
  '/auth/registrar',
  autenticado,
  permitirPerfis('administrador'),
  AuthController.registrar.bind(AuthController)
);

authRoutes.post(
  '/auth/logout',
  AuthController.logout.bind(AuthController)
);

export default authRoutes;
