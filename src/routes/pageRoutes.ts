import { Router, Request, Response } from "express";

import { autenticado } from "../middlewares/authMiddleware";
import { permitirPerfis } from "../middlewares/perfilMiddleware";

const pageRoutes = Router();

type UsuarioSessao = NonNullable<Request["session"]["usuario"]>;

function usuarioDaSessao(req: Request): UsuarioSessao {
  return req.session.usuario as UsuarioSessao;
}

// Dashboard
pageRoutes.get(
  "/dashboard",
  autenticado,
  (req: Request, res: Response) => {
    const usuario = usuarioDaSessao(req);

    if (usuario.perfil === "professor") {
      res.render("dashboard/dashboard-professor", { usuario });
      return;
    }

    if (usuario.perfil === "aluno") {
      res.render("dashboard/dashboard-aluno", { usuario });
      return;
    }

    if (usuario.perfil === "administrador") {
      res.render("dashboard/dashboard-admin", { usuario });
      return;
    }

    res.status(403).send("Perfil de usuário inválido.");
  }
);

// Tela NOA — somente alunos
pageRoutes.get(
  "/noa",
  autenticado,
  permitirPerfis("aluno"),
  (req: Request, res: Response) => {
    const usuario = usuarioDaSessao(req);

    res.render("noa/noa", {
      usuario,
      atividades: [
        {
          nome: "Lógica de Programação",
          horario: "Terça-feira — 13:00 às 14:40",
          professor: "Prof. Ana Ribeiro",
          sala: "Ambiente Virtual",
          vagasTotal: 30,
          vagasOcupadas: 18,
        },
        {
          nome: "Oficina de Portfólio Digital",
          horario: "Quinta-feira — 15:00 às 16:40",
          professor: "Prof. Marina Lima",
          sala: "Laboratório 04",
          vagasTotal: 20,
          vagasOcupadas: 20,
        },
      ],
      minhasInscricoes: [],
    });
  }
);

// Pesquisa — qualquer usuário autenticado
pageRoutes.get(
  "/search",
  autenticado,
  (req: Request, res: Response) => {
    const usuario = usuarioDaSessao(req);

    res.render("search/search-filters", {
      usuario,
      perfil:
        usuario.perfil === "administrador"
          ? "admin"
          : usuario.perfil,
    });
  }
);

// Detalhes de uma aula
pageRoutes.get(
  "/classes/details",
  autenticado,
  (req: Request, res: Response) => {
    const usuario = usuarioDaSessao(req);

    res.render("classes/class-details", {
      usuario,
      aula: {
        id: String(req.query.id ?? "1"),
        disciplina: "Desenvolvimento Web II",
        isNoa: false,
        professor: {
          id: "a1b2c3d4-0001-4000-8000-000000000001",
          nome: "Prof. Ana Ribeiro",
          iniciais: "AR",
        },
        sala: "Lab 03 — Bloco B",
        predio: "Bloco B",
        diaSemana: "Terça-feira",
        horarioInicio: "10:00",
        horarioFim: "11:40",
        turma: "3º Módulo — Técnico em Informática",
        descricao:
          "Aula prática de desenvolvimento de aplicações web.",
      },
    });
  }
);

// Painel administrativo — somente administradores
pageRoutes.get(
  "/admin",
  autenticado,
  permitirPerfis("administrador"),
  (req: Request, res: Response) => {
    const usuario = usuarioDaSessao(req);

    res.render("admin/admin-panel", {
      usuario: {
        ...usuario,
        perfil: "admin",
      },
    });
  }
);

export default pageRoutes;
