
import { Router, Request, Response, NextFunction } from 'express';
import AuthController from '../controllers/AuthController';

const authRoutes = Router();

function exigirAdministrador(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const usuario = req.session?.usuario;

  if (!usuario) {
    res.status(401).json({
      success: false,
      message: 'Não autenticado.',
    });
    return;
  }

  if (usuario.perfil !== 'administrador') {
    res.status(403).json({
      success: false,
      message: 'Apenas administradores podem cadastrar usuários.',
    });
    return;
  }

  next();
}

authRoutes.get('/login', (_req: Request, res: Response) => {
  res.render('auth/login', { error: null });
});

authRoutes.post('/auth/login', AuthController.login);
authRoutes.post('/auth/registrar', exigirAdministrador, AuthController.registrar);
authRoutes.post('/auth/logout', AuthController.logout);

export default authRoutes;
