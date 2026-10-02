import { Request, Response } from 'express';
import { authenticate, saveUser } from '../services/SchoolService';
import { HttpError } from '../services/validation';

export class AuthController {
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, remember } = req.body as {
        email?: string;
        password?: string;
        remember?: string;
      };

      const usuario = await authenticate(email, password);

      req.session.usuario = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      };

      if (remember) {
        // "Lembrar-me": mantém a sessão ativa por 30 dias
        req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30;
      }

      res.redirect('/dashboard');
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      res.status(error.status).render('auth/login', { error: error.message });
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await new Promise<void>((resolve, reject) =>
      req.session.destroy(error => (error ? reject(error) : resolve()))
    );
    res.clearCookie('senac.sid');
    res.redirect('/login');
  };

  registrar = async (req: Request, res: Response): Promise<void> => {
    const usuario = await saveUser(req.body || {}, undefined, req.session.usuario!.id);
    res.status(201).json({ success: true, usuario });
  };
}

export default new AuthController();