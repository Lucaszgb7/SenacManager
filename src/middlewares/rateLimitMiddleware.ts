import { Request, Response, NextFunction } from 'express';

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  blockedUntil?: number;
}

/**
 * Limitador em memória para tentativas excessivas de login (proteção contra brute-force / automação).
 * - Considera IP (respeitando trust proxy) e e-mail de login normalizado.
 * - Janela deslizante de 15 minutos, máximo de 5 tentativas incorretas.
 * - Bloqueio temporário (15 minutos) com cabeçalho Retry-After.
 * - Não bloqueia usuários indefinidamente.
 * - Não expõe e-mails cadastrados.
 */
class LoginRateLimiter {
  private attempts = new Map<string, AttemptRecord>();
  private readonly maxAttempts = 5;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutos
  private readonly blockDurationMs = 15 * 60 * 1000; // 15 minutos de bloqueio

  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Limpeza de registros antigos a cada 5 minutos
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private getKey(req: Request, email?: string): string {
    // req.ip utiliza o endereço remoto real baseado em trust proxy
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const normalizedEmail = (email || '').trim().toLowerCase();
    return normalizedEmail ? `${ip}:${normalizedEmail}` : `ip:${ip}`;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      if ((record.blockedUntil && record.blockedUntil <= now) || (now - record.lastAttemptAt > this.windowMs)) {
        this.attempts.delete(key);
      }
    }
  }

  check(req: Request, email?: string): { allowed: boolean; retryAfterSeconds: number } {
    const key = this.getKey(req, email);
    const ipKey = this.getKey(req);
    const now = Date.now();

    for (const k of [key, ipKey]) {
      const record = this.attempts.get(k);
      if (record?.blockedUntil && record.blockedUntil > now) {
        const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
        return { allowed: false, retryAfterSeconds };
      }
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  recordFailure(req: Request, email?: string): void {
    const key = this.getKey(req, email);
    const now = Date.now();
    let record = this.attempts.get(key);

    if (!record || now - record.firstAttemptAt > this.windowMs) {
      record = { count: 1, firstAttemptAt: now, lastAttemptAt: now };
    } else {
      record.count += 1;
      record.lastAttemptAt = now;
      if (record.count >= this.maxAttempts) {
        record.blockedUntil = now + this.blockDurationMs;
      }
    }

    this.attempts.set(key, record);
  }

  recordSuccess(req: Request, email?: string): void {
    const key = this.getKey(req, email);
    this.attempts.delete(key);
  }

  reset(): void {
    this.attempts.clear();
  }
}

export const loginLimiterInstance = new LoginRateLimiter();

export function loginRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const email = (req.body?.email as string | undefined)?.trim();
  const status = loginLimiterInstance.check(req, email);

  if (!status.allowed) {
    res.setHeader('Retry-After', String(status.retryAfterSeconds));
    const minutes = Math.ceil(status.retryAfterSeconds / 60);
    const message = `Muitas tentativas de login incorretas. Aguarde ${minutes} minuto(s) antes de tentar novamente.`;

    const accept = req.headers.accept ?? '';
    const contentType = req.headers['content-type'] ?? '';
    const isJson = accept.includes('application/json') || contentType.includes('application/json');

    if (isJson) {
      res.status(429).json({ success: false, message });
      return;
    }

    res.status(429).render('auth/login', { error: message });
    return;
  }

  next();
}

export function resetLoginRateLimiter(): void {
  loginLimiterInstance.reset();
}
