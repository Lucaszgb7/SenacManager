
import express from "express";
import path from "path";

import sessionMiddleware from "./config/session";
import authRoutes from "./routes/authRoutes";
import { showProfile } from "./controllers/profile-controller";
import { autenticado } from "./middlewares/authMiddleware";
import { errorMiddleware } from "./middlewares/errorMiddleware";

const app = express();

// Configuração das views EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Arquivos estáticos: CSS, JavaScript e imagens
app.use(express.static(path.join(__dirname, "..", "public")));

// Leitura de formulários e JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuração da sessão
app.use(sessionMiddleware);

// Rotas públicas
app.get("/", (_req, res) => {
  res.redirect("/login");
});

// Central de ajuda
app.get("/ajuda", (_req, res) => {
  res.render("auth/help");
});

// Rotas de autenticação existentes
app.use(authRoutes);

// Rota protegida do perfil
app.get("/perfil", autenticado, showProfile);

// Página não encontrada
app.use((req, res) => {
  const accept = req.headers["accept"] ?? "";

  if (accept.includes("application/json")) {
    res.status(404).json({
      success: false,
      message: "Rota não encontrada."
    });
    return;
  }

  res.status(404).send("404 — Página não encontrada");
});

// Tratamento de erros: deve permanecer por último
app.use(errorMiddleware);

export default app;
