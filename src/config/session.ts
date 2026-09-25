import session from 'express-session';
const production = process.env.NODE_ENV === 'production';
if (production && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET é obrigatória em produção.');
// MemoryStore is intentional for the single-process JSON deployment.
// Restarting the process ends active sessions.
export default session({
  secret: process.env.SESSION_SECRET || 'senacmanager-dev-secret-troque-em-producao',
  resave: false,
  saveUninitialized: false,
  name: 'senac.sid',
  cookie: { httpOnly: true, secure: production, sameSite: 'lax' },
});
