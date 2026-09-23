// src/types/express-session.d.ts
import "express-session";

declare module "express-session" {
  interface SessionData {
    usuario?: {
      id: string;
      nome: string;
      email: string;
      perfil: string;
    };
  }
}