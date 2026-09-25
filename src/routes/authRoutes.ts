// src/routes/authRoutes.ts
import { Router, Request, Response } from 'express';
import { autenticado } from '../middlewares/authMiddleware';
import { permitirPerfis } from '../middlewares/perfilMiddleware';
import AuthController from '../controllers/AuthController';

const authRoutes = Router();


authRoutes.get('/login', (_req: Request, res: Response) => {
  res.render('auth/login', { error: null });
});

<<<<<<< HEAD

authRoutes.post('/auth/login', AuthController.login);


authRoutes.post('/auth/registrar', autenticado, permitirPerfis('administrador'), AuthController.registrar);


authRoutes.post('/auth/logout', AuthController.logout);
=======
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
>>>>>>> bb0b303c275aac728f4e4111562a362c213d064b

export default authRoutes;