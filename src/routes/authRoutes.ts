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
authRoutes.post('/auth/login', AuthController.login);

/**
 * POST /auth/registrar
 * Cria nova conta. IMPORTANTE: em produção, envolver com middleware
 * `isAuthenticated` + `isAdmin` para impedir cadastro público indevido.
 * Ex.: router.post('/auth/registrar', isAuthenticated, isAdmin, AuthController.registrar)
 */
authRoutes.post('/auth/registrar', AuthController.registrar);

/**
 * POST /auth/logout
 * Encerra a sessão.
 */
authRoutes.post('/auth/logout', AuthController.logout);

export default authRoutes;