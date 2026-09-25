// src/routes/authRoutes.ts
import { Router, Request, Response } from 'express';
import { autenticado } from '../middlewares/authMiddleware';
import { permitirPerfis } from '../middlewares/perfilMiddleware';
import AuthController from '../controllers/AuthController';

const authRoutes = Router();


authRoutes.get('/login', (_req: Request, res: Response) => {
  res.render('auth/login', { error: null });
});


authRoutes.post('/auth/login', AuthController.login);


authRoutes.post('/auth/registrar', autenticado, permitirPerfis('administrador'), AuthController.registrar);


authRoutes.post('/auth/logout', AuthController.logout);

export default authRoutes;