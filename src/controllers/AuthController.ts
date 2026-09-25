import { Request, Response } from 'express';
import { authenticate, saveUser } from '../services/SchoolService';
import { HttpError } from '../services/validation';
export class AuthController {
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body as {
        email?: string;
        password?: string;
      };

      if (!email || !password) {
        res.status(400).render('auth/login', {
          error: 'E-mail ou senha inválidos',
        });
        return;
      }

      const usuario = await this.usuarioRepository.buscarPorEmail(email);

      if (!usuario) {
        res.status(401).render('auth/login', {
          error: 'E-mail ou senha inválidos',
        });
        return;
      }

      const senhaValida = await bcrypt.compare(
        password,
        usuario.senhaHash
      );

      if (!senhaValida) {
        res.status(401).render('auth/login', {
          error: 'E-mail ou senha inválidos',
        });
        return;
      }

      // Linha 54 corrigida com asserção preventiva para evitar incompatibilidades de campos do banco
req.session.usuario = {
  id: usuario.id,
  nome: usuario.nome,
  email: usuario.email,
  perfil:
    usuario.perfil === "admin"
      ? "administrador"
      : usuario.perfil,
} as any;



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
