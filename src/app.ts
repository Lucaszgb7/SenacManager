// src/app.ts
import express from "express";
import path from "path";

import sessionMiddleware from "./config/session";
import authRoutes from "./routes/authRoutes";
import roomRoutes from "./routes/roomRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import profileRoutes from "./routes/profileRoutes";

import { showProfile } from "./controllers/profile-controller";
import { autenticado } from "./middlewares/authMiddleware";
import { errorMiddleware } from "./middlewares/errorMiddleware";
import pageRoutes from "./routes/pageRoutes";


const app = express();

// ---------- View engine ----------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ---------- Middlewares globais ----------
// Serve public/ — inclui /uploads/avatars/ servido como URL pública.
app.use(express.static(path.join(__dirname, "..", "public")));

// Parsers de body (urlencoded para forms, json para fetch).
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessão — ANTES de qualquer rota que use req.session.
app.use(sessionMiddleware);

// Entrada principal da aplicação.
app.get("/", (_req, res) => {
  res.redirect("/login");
});

// Rotas públicas
app.use(authRoutes);


// Rotas autenticadas
app.use(roomRoutes);
app.use(bookingRoutes);
app.use(profileRoutes);
app.use(pageRoutes);

// Rota 404 — deve ficar depois das rotas reais
app.use((req, res) => {
  const accept = req.headers["accept"] ?? "";

  if (accept.includes("application/json")) {
    res.status(404).json({
      success: false,
      message: "Rota não encontrada.",
    });
    return;
  }

  res.status(404).send("404 — Página não encontrada");
});


// ---------- Tratamento de erros ----------
// SEMPRE por último.
app.use(errorMiddleware);

export default app;