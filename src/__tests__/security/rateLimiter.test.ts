import { Request, Response, NextFunction } from 'express';
import {
  loginRateLimiter,
  loginLimiterInstance,
  resetLoginRateLimiter,
} from '../../middlewares/rateLimitMiddleware';

describe('Segurança — Rate Limiting de Tentativas de Login', () => {
  beforeEach(() => {
    resetLoginRateLimiter();
  });

  afterEach(() => {
    resetLoginRateLimiter();
  });

  it('permite tentativas normais abaixo do limite máximo (5 tentativas)', () => {
    const req = {
      ip: '192.168.1.10',
      socket: { remoteAddress: '192.168.1.10' },
      body: { email: 'usuario@senac.br' },
      headers: {},
    } as unknown as Request;

    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      render: jest.fn(),
    } as unknown as Response;

    const next = jest.fn() as NextFunction;

    // 1ª a 4ª tentativa devem passar livremente
    for (let i = 0; i < 4; i++) {
      loginLimiterInstance.recordFailure(req, 'usuario@senac.br');
      loginRateLimiter(req, res, next);
    }

    expect(next).toHaveBeenCalledTimes(4);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('bloqueia com 429 após 5 tentativas incorretas consecutivas', () => {
    const req = {
      ip: '192.168.1.50',
      socket: { remoteAddress: '192.168.1.50' },
      body: { email: 'ataque@senac.br' },
      headers: { accept: 'application/json' },
    } as unknown as Request;

    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      render: jest.fn(),
    } as unknown as Response;

    const next = jest.fn() as NextFunction;

    // Registra 5 falhas consecutivas
    for (let i = 0; i < 5; i++) {
      loginLimiterInstance.recordFailure(req, 'ataque@senac.br');
    }

    // A próxima requisição deve ser bloqueada
    loginRateLimiter(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Muitas tentativas'),
      })
    );
  });

  it('libera o IP/e-mail após login bem-sucedido', () => {
    const req = {
      ip: '192.168.1.60',
      socket: { remoteAddress: '192.168.1.60' },
      body: { email: 'aluno@senac.br' },
      headers: { accept: 'application/json' },
    } as unknown as Request;

    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      render: jest.fn(),
    } as unknown as Response;

    const next = jest.fn() as NextFunction;

    // 3 falhas seguidas
    for (let i = 0; i < 3; i++) {
      loginLimiterInstance.recordFailure(req, 'aluno@senac.br');
    }

    // Sucesso registrado
    loginLimiterInstance.recordSuccess(req, 'aluno@senac.br');

    // Deve passar livremente
    loginRateLimiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
