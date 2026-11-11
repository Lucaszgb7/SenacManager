/// <reference path="./types/express-session.d.ts" />
import express from 'express';
import path from 'path';
import sessionMiddleware from './config/session';
import { csrfMiddleware } from './middlewares/csrfMiddleware';
import { avatarDirectory } from './config/multer';
import authRoutes from './routes/authRoutes';
import roomRoutes from './routes/roomRoutes';
import bookingRoutes from './routes/bookingRoutes';
import profileRoutes from './routes/profileRoutes';
import pageRoutes from './routes/pageRoutes';
import { errorMiddleware } from './middlewares/errorMiddleware';
import { findUser, safeUser } from './services/SchoolService';
const app = express();
app.disable('x-powered-by');
// Configuração explícita de Trust Proxy:
// - Desativado quando TRUST_PROXY=0 ou TRUST_PROXY=false
// - Habilitado quando TRUST_PROXY=true ou número/string de subnets confiáveis (ex: 'loopback', '127.0.0.1')
// - Em Codespaces ou produção: 1 hop de proxy reverso
const trustProxyEnv = process.env.TRUST_PROXY;
const trustProxy: boolean | number | string =
  trustProxyEnv === '0' || trustProxyEnv === 'false'
    ? false
    : trustProxyEnv === 'true'
      ? true
      : trustProxyEnv && !isNaN(Number(trustProxyEnv))
        ? Number(trustProxyEnv)
        : trustProxyEnv && trustProxyEnv.trim() !== ''
          ? trustProxyEnv.trim()
          : (process.env.CODESPACES === 'true' || process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || process.env.NODE_ENV === 'production' ? 1 : 1);
app.set('trust proxy', trustProxy);
app.set('view engine', 'ejs');
// O código compilado também pode usar os templates de origem se dist/views não existir.
app.set('views', [path.join(__dirname, 'views'), path.resolve(__dirname, '../src/views')]);
app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });
app.use('/uploads/avatars', express.static(avatarDirectory()));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));
app.use(sessionMiddleware);
app.use(csrfMiddleware);
app.use(async (req, res, next) => {
  res.locals.usuario = null;
  res.locals.perfil = 'aluno';
  const isProd = process.env.NODE_ENV === 'production';
  res.locals.showDemoAccounts = !isProd && (process.env.SHOW_DEMO_ACCOUNTS === 'true' || process.env.SHOW_DEMO_ACCOUNTS === undefined);
  res.locals.paginaAtual = ({ '/dashboard': 'dashboard', '/rooms/available': 'rooms-available', '/rooms/booking': 'rooms-booking', '/bookings/my': 'bookings-my', '/profile': 'profile', '/search': 'search', '/noa': 'noa', '/admin': 'admin' } as Record<string, string>)[req.path] || '';
  if (req.session.usuario) {
    try {
      const user = await findUser(req.session.usuario.id);
      if (!user || !user.ativo) {
        delete req.session.usuario;
      } else {
        req.session.usuario = { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil };
        res.locals.usuario = safeUser(user);
        res.locals.perfil = user.perfil;
      }
    } catch (err) {
      return next(err);
    }
  }
  next();
});
app.get('/', (_req, res) => { res.redirect('/login'); });
app.get(['/auth/forgot-password', '/contato', '/ajuda'], (_req, res) => {
  res.render('auth/help', { title: 'Ajuda de acesso' });
});
app.use(authRoutes);
app.use(roomRoutes);
app.use(bookingRoutes);
app.use(profileRoutes);
app.use(pageRoutes);
app.use((req, res) => {
  if ((req.headers.accept || '').includes('application/json')) res.status(404).json({ success: false, message: 'Rota não encontrada.' });
  else res.status(404).render('errors/error', { status: 404, message: 'Página não encontrada.' });
});
app.use(errorMiddleware);
export default app;

