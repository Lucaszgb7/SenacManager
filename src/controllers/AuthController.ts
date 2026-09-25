import { Request, Response } from 'express';
import { authenticate, saveUser } from '../services/SchoolService';
import { HttpError } from '../services/validation';
export class AuthController {
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const usuario = await authenticate(req.body?.email, req.body?.password);
      await new Promise<void>((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
      req.session.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil };
      if (req.body.remember === '1' || req.body.remember === true) req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      else req.session.cookie.expires = null;
      await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
      res.redirect('/dashboard');
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      res.status(error.status).render('auth/login', { error: error.message });
    }
  };
  logout = async (req: Request, res: Response): Promise<void> => {
    await new Promise<void>((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
    res.clearCookie('senac.sid');
    res.redirect('/login');
  };
  registrar = async (req: Request, res: Response): Promise<void> => {
    const usuario = await saveUser(req.body || {}, undefined, req.session.usuario!.id);
    res.status(201).json({ success: true, usuario });
  };
}
export default new AuthController();
