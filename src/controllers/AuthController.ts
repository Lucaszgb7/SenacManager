import { Request, Response } from 'express';
import bcrypt from 'bcrypt';

import { UsuarioRepository } from '../repositories/UsuarioRepository';
import { Professor } from '../models/Professor';
import { Aluno } from '../models/Aluno';
import { Administrador } from '../models/Administrador';

export class AuthController {
  private usuarioRepository: UsuarioRepository;

  constructor() {
    this.usuarioRepository = new UsuarioRepository();
  }

  /**
   * POST /auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
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
        perfil: usuario.perfil,
      } as any;

      res.redirect('/dashboard');
    } catch (err) {
      console.error('[AuthController.login] Erro:', err);

      res.status(500).render('auth/login', {
        error: 'Erro interno. Tente novamente mais tarde.',
      });
    }
  }

  /**
   * POST /auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    req.session.destroy((err) => {
      if (err) {
        console.error(
          '[AuthController.logout] Erro ao destruir sessão:',
          err
        );

        res.status(500).json({
          success: false,
          message: 'Erro ao sair.',
        });

        return;
      }

      res.clearCookie('senac.sid');
      res.redirect('/login');
    });
  }

  /**
   * POST /auth/registrar
   */
  async registrar(req: Request, res: Response): Promise<void> {
    try {
      const {
        nome,
        email,
        senha,
        perfil,
        disciplinas,
        curso,
        turma,
      } = req.body;

      if (!nome || !email || !senha || !perfil) {
        res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: nome, email, senha e perfil.',
        });
        return;
      }

      if (
        perfil !== 'professor' &&
        perfil !== 'aluno' &&
        perfil !== 'administrador'
      ) {
        res.status(400).json({
          success: false,
          message:
            'Perfil inválido. Use: professor, aluno ou administrador.',
        });
        return;
      }

      const existente =
        await this.usuarioRepository.buscarPorEmail(email);

      if (existente) {
        res.status(409).json({
          success: false,
          message: 'Já existe um usuário com este e-mail.',
        });
        return;
      }

      const senhaHash = await bcrypt.hash(senha, 10);

      let usuarioCriado;

      switch (perfil) {
        case 'professor':
          usuarioCriado = new Professor(
            nome,
            email,
            senhaHash,
            disciplinas ?? []
          );
          break;

        case 'aluno':
          usuarioCriado = new Aluno(
            nome,
            email,
            senhaHash,
            curso ?? '',
            turma ?? ''
          );
          break;

        case 'administrador':
          usuarioCriado = new Administrador(
            nome,
            email,
            senhaHash
          );
          break;
        
        default:
          throw new Error('Perfil não suportado.');
      }

      const salvo =
        await this.usuarioRepository.criar(usuarioCriado);

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso.',
        usuario: {
          id: salvo.id,
          nome: salvo.nome,
          email: salvo.email,
          perfil: salvo.perfil,
        },
      });
    } catch (err) {
      console.error('[AuthController.registrar] Erro:', err);

      res.status(500).json({
        success: false,
        message: 'Erro interno ao criar usuário.',
      });
    }
  }
}

export default new AuthController();
