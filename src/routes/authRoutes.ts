// src/routes/authRoutes.ts
import { Router, Request, Response } from 'express';
import AuthController from '../controllers/AuthController';

const authRoutes = Router();

/**
 * GET /login
 * Renderiza a tela de login sem mensagem de erro.
 */
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
  AuthController.registrar.bind(AuthController)
);

authRoutes.post(
  '/auth/logout',
  AuthController.logout.bind(AuthController)
);

export default authRoutes;