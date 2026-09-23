// src/app.ts
import express from "express";
import path from "path";

import sessionMiddleware from "./config/session";
import authRoutes from "./routes/authRoutes";
import { showProfile } from "./controllers/profile-controller";
import { autenticado } from "./middlewares/authMiddleware";
import { permitirPerfis } from "./middlewares/perfilMiddleware";
import { errorMiddleware } from "./middlewares/errorMiddleware";

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
// Sem isso, autenticado/permitirPerfis não conseguem ler req.session.usuario.
app.use(sessionMiddleware);

// ---------- Rotas públicas ----------
app.get("/", (_req, res) => {
  res.redirect("/login");
});

// authRoutes declara:
//   GET  /login
//   POST /auth/login
//   POST /auth/registrar   (ver observação abaixo sobre proteção)
//   POST /auth/logout
app.use(authRoutes);

// ---------- Rotas protegidas ----------
// EXEMPLO: apenas usuários logados acessam o perfil.
// O middleware `autenticado` roda ANTES do controller — se não houver
// sessão válida, ele redireciona para /login (ou devolve 401 JSON).
app.get("/perfil", autenticado, showProfile);

// EXEMPLO: rota só para administradores.
// Ordem importa: primeiro checa autenticação, depois o perfil.
// (Descomente quando tiver o controller de admin pronto.)
//
// import { showAdminPanel } from "./controllers/admin-controller";
// app.get(
//   "/admin",
//   autenticado,
//   permitirPerfis("administrador"),
//   showAdminPanel
// );

// ---------- 404 (catch-all) ----------
// SEGURANÇA: precisa vir DEPOIS de todas as rotas e ANTES do errorMiddleware.
// Se nada acima respondeu, é porque a rota não existe.
app.use((req, res) => {
  const accept = req.headers["accept"] ?? "";
  if (accept.includes("application/json")) {
    res.status(404).json({ success: false, message: "Rota não encontrada." });
    return;
  }
  res.status(404).send("404 — Página não encontrada");
});

// ---------- Tratamento de erros ----------
// SEGURANÇA: `errorMiddleware` DEVE ser o último app.use.
// Qualquer next(err) lançado por controllers/middlewares anteriores cai aqui,
// é logado internamente e respondido com mensagem genérica ao cliente.
app.use(errorMiddleware);

export default app;