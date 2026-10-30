import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';

import { UsuarioRepository } from '../repositories/UsuarioRepository';
import { Professor } from '../models/Professor';
import { Aluno } from '../models/Aluno';
import { Administrador } from '../models/Administrador';
import { authenticate } from '../services/SchoolService';
import { HttpError } from '../services/validation';
import { DatabaseError } from '../services/store';

/**
 * Detecta se a requisição provém de uma chamada de API (JSON/fetch)
 * ou de um formulário de navegador tradicional (HTML).
 */
function isApi(req: Request): boolean {
  const accept = req.headers.accept ?? '';
  const contentType = req.headers['content-type'] ?? '';
  const xRequestedWith = req.headers['x-requested-with'] ?? '';
  return (
    accept.includes('application/json') ||
    contentType.includes('application/json') ||
    xRequestedWith === 'XMLHttpRequest'
  );
}

/**
 * Responde erro no formato esperado pelo cliente:
 * - JSON para requisições de API / fetch.
 * - Renderização do template HTML para navegadores.
 */
function responderErro(req: Request, res: Response, status: number, mensagem: string): void {
  if (isApi(req)) {
    res.status(status).json({
      success: false,
      message: mensagem,
    });
    return;
  }
  res.status(status).render('auth/login', { error: mensagem });
}

export class AuthController {
  /**
   * Realiza a autenticação do usuário.
   * Centraliza a validação das credenciais com o SchoolService.authenticate,
   * prevenindo duplicação de regras e garantindo que falhas de conexão
   * com o banco não sejam confundidas com credenciais inválidas.
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, remember } = req.body as {
        email?: string;
        password?: string;
        remember?: string | boolean;
      };

      if (!email || !password) {
        responderErro(req, res, 400, 'E-mail ou senha inválidos');
        return;
      }

      let usuario;
      try {
        usuario = await authenticate(email, password);
      } catch (authErr: any) {
        if (authErr instanceof HttpError) {
          responderErro(req, res, authErr.status, authErr.message);
          return;
        }
        throw authErr;
      }

      const dadosUsuario = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      };

      // Renova a sessão para segurança e grava antes de redirecionar
      req.session.regenerate((err) => {
        if (err) {
          console.error('[AuthController.login] Erro ao regenerar sessão:', err);
          responderErro(req, res, 500, 'Erro interno. Tente novamente mais tarde.');
          return;
        }

        req.session.usuario = dadosUsuario;

        // Se 'remember' foi selecionado, estende a validade do cookie para 30 dias
        if (remember === '1' || remember === 'true' || remember === true || remember === 'on') {
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
        }

        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('[AuthController.login] Erro ao salvar sessão:', saveErr);
            responderErro(req, res, 500, 'Erro interno. Tente novamente mais tarde.');
            return;
          }

          res.redirect('/dashboard');
        });
      });
    } catch (err: any) {
      console.error('[AuthController.login] Erro inesperado:', err);
      const isDbError =
        err instanceof DatabaseError ||
        err?.status === 503 ||
        err?.code === 'ECONNREFUSED' ||
        err?.code === 'ETIMEDOUT' ||
        err?.code === 'ENOTFOUND' ||
        err?.message?.includes('Banco de dados indisponível') ||
        err?.message?.includes('Configuração MySQL incompleta');

      if (isDbError) {
        responderErro(req, res, 503, 'Banco de dados indisponível. Tente novamente mais tarde.');
        return;
      }

      responderErro(req, res, 500, 'Erro interno. Tente novamente mais tarde.');
    }
  }

  /**
   * Encerra a sessão do usuário e limpa o cookie identificador.
   */
  async logout(req: Request, res: Response): Promise<void> {
    const isApiReq = isApi(req);
    req.session.destroy((err) => {
      if (err) {
        console.error(
          '[AuthController.logout] Erro ao destruir sessão:',
          err
        );

        if (isApiReq) {
          res.status(500).json({
            success: false,
            message: 'Erro ao sair.',
          });
          return;
        }

        res.redirect('/login');
        return;
      }

      res.clearCookie('senac.sid');

      res.redirect('/login');
    });
  }

  /**
   * Cadastra novos usuários pelo painel administrativo.
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
      } = req.body as {
        nome?: string;
        email?: string;
        senha?: string;
        perfil?: 'professor' | 'aluno' | 'administrador';
        disciplinas?: string[];
        curso?: string;
        turma?: string;
      };

      if (!nome || !email || !senha || !perfil) {
        res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: nome, email, senha e perfil.',
        });
        return;
      }

      const usuarioRepository = new UsuarioRepository();
      const emailNormalizado = email.trim().toLowerCase();

      const existente = await usuarioRepository.buscarPorEmail(emailNormalizado);

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
            emailNormalizado,
            senhaHash,
            disciplinas ?? []
          );
          break;

        case 'aluno':
          if (!curso || !turma) {
            res.status(400).json({
              success: false,
              message: 'Curso e turma são obrigatórios para aluno.',
            });
            return;
          }

          usuarioCriado = new Aluno(
            nome,
            emailNormalizado,
            senhaHash,
            curso,
            turma
          );
          break;

        case 'administrador':
          usuarioCriado = new Administrador(
            nome,
            emailNormalizado,
            senhaHash
          );
          break;

        default:
          res.status(400).json({
            success: false,
            message:
              'Perfil inválido. Use: professor, aluno ou administrador.',
          });
          return;
      }

      const salvo = await usuarioRepository.criar(usuarioCriado);

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