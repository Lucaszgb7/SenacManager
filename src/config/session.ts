// src/config/session.ts
import session from 'express-session';

/**
 * Configuração do middleware express-session.
 *
 * PONTOS CRÍTICOS DE SEGURANÇA:
 * - O `secret` NUNCA deve ser hardcoded em produção. Usamos variável de
 *   ambiente (SESSION_SECRET) e apenas em desenvolvimento caímos em um
 *   fallback previsível. Em produção, se a env não existir, o ideal é
 *   falhar rápido (fail-fast), mas aqui mantemos o fallback para não
 *   quebrar o setup local.
 * - `resave: false` evita regravar a sessão a cada request sem alteração.
 * - `saveUninitialized: false` impede criar sessões vazias (evita DoS de
 *   armazenamento e também ajuda com requisitos de consentimento/LGPD).
 * - `cookie.httpOnly: true` impede acesso via JavaScript (mitiga XSS).
 * - `cookie.sameSite: 'lax'` oferece proteção básica contra CSRF.
 * - `cookie.secure` deve ser `true` em produção (somente HTTPS).
 */
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.SESSION_SECRET) {
  // Fail-fast: em produção não aceitamos o fallback inseguro.
  throw new Error(
    'SESSION_SECRET não definida em produção. Defina a variável de ambiente antes de iniciar o servidor.'
  );
}

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'senacmanager-dev-secret-troque-em-producao',
  resave: false,
  saveUninitialized: false,
  name: 'senac.sid', // não usar o nome padrão "connect.sid" (fingerprint reduction)
  cookie: {
    httpOnly: true,
    secure: isProduction, // HTTPS obrigatório em produção
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24, // 1 dia
  },
});

export default sessionMiddleware;