/// <reference path="./types/express-session.d.ts" />
import express from 'express';
import path from 'path';
import sessionMiddleware from './config/session';
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
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });
app.use('/uploads/avatars', express.static(avatarDirectory()));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));
app.use(sessionMiddleware);
app.use(async (req, res, next) => {
  res.locals.usuario = null;
  res.locals.perfil = 'aluno';
  res.locals.paginaAtual = ({ '/dashboard': 'dashboard', '/rooms/available': 'rooms-available', '/rooms/booking': 'rooms-booking', '/bookings/my': 'bookings-my', '/profile': 'profile', '/search': 'search', '/noa': 'noa', '/admin': 'admin' } as Record<string, string>)[req.path] || '';
  if (req.session.usuario) {
    const user = await findUser(req.session.usuario.id);
    if (!user || !user.ativo) {
      delete req.session.usuario;
    } else {
      req.session.usuario = { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil };
      res.locals.usuario = safeUser(user);
      res.locals.perfil = user.perfil;
    }
  }
  next();
});
app.get('/', (_req, res) => { res.redirect('/login'); });
app.get(['/auth/forgot-password', '/contato'], (_req, res) => {
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
