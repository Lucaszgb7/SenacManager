// src/app.ts
import express from "express";
import path from "path";

import sessionMiddleware from "./config/session";
import authRoutes from "./routes/authRoutes";
import { showProfile } from "./controllers/profile-controller";

const app = express();

// ---------- View engine ----------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ---------- Middlewares globais ----------
app.use(express.static(path.join(__dirname, "..", "public")));

// SEGURANÇA: precisamos destes dois parsers ANTES das rotas que leem body.
// - urlencoded: necessário para o <form> de login (application/x-www-form-urlencoded)
// - json: necessário para a chamada fetch() do painel admin em /auth/registrar
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// SEGURANÇA: sessão deve vir ANTES das rotas que dependem de req.session.
app.use(sessionMiddleware);

// ---------- Rotas ----------
app.get("/", (_req, res) => {
  res.redirect("/login");
});

// authRoutes já declara GET /login, POST /auth/login, POST /auth/registrar, POST /auth/logout.
// Registrar aqui evita duplicar a definição de /login.
app.use(authRoutes);

app.get("/perfil", showProfile);

export default app;