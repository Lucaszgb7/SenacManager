import { Request, Response } from "express";

const usuarios = {
  professor: { nome: "Mariana Costa", email: "mariana.costa@senac.com", telefone: "(11) 99842-1630", perfil: "professor", disciplinas: ["Desenvolvimento Web", "Banco de Dados"] },
  aluno: { nome: "Rafael Almeida", email: "rafael.almeida@aluno.senac.com", telefone: "(11) 98736-2541", perfil: "aluno", curso: "Técnico em Informática", turma: "TI 2026 · Turma B" },
  admin: { nome: "Camila Santos", email: "camila.santos@senac.com", telefone: "(11) 97625-3814", perfil: "admin" }
};

// A seleção por query serve apenas à demonstração, sem autenticação.
export function showProfile(req: Request, res: Response) {
  const perfil = req.query.perfil === "aluno" ? "aluno" : req.query.perfil === "admin" ? "admin" : "professor";
  res.render("profile/profile", { usuario: usuarios[perfil] });
}