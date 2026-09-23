import 'express-session';
import { Perfil } from '../models/Usuario';

declare module 'express-session' {
  interface SessionData {
    usuario?: {
      id: string;
      nome: string;
      email: string;
      perfil: Perfil;
    };
  }
}