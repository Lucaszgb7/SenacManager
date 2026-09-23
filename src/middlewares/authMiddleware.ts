// src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from "express";

/**
 * Middleware `autenticado`
 * -----------------------------------------------------------------
 * FLUXO:
 *   1. Verifica se existe uma sessão ativa em req.session.usuario.
 *   2. Se existir, libera a requisição com next().
 *   3. Se NÃO existir, decide a resposta com base no tipo de cliente:
 *      - Requisição de API / fetch (Accept ou Content-Type = JSON)
 *        → responde 401 em JSON (o front trata o erro no código).
 *      - Requisição de navegador (HTML)
 *        → redireciona para /login (experiência de usuário).
 *
 * SEGURANÇA:
 *   - Só confiamos em req.session.usuario, que é populado no servidor
 *     pelo AuthController. Nunca confiar em headers como "X-User-Id"
 *     vindos do cliente.
 */
export function autenticado(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 1) Sessão válida? Segue o fluxo normal.
  if (req.session && req.session.usuario) {
    return next();
  }

  // 2) Detecta se a requisição espera JSON (API / fetch) ou HTML (navegador).
  //    - Accept: enviado por fetch/XHR com "application/json"
  //    - Content-Type: enviado por POSTs JSON
  //    - X-Requested-With: header clássico de XHR (fallback)
  const acceptHeader = req.headers["accept"] ?? "";
  const contentType = req.headers["content-type"] ?? "";
  const xRequestedWith = req.headers["x-requested-with"] ?? "";

  const isApiRequest =
    acceptHeader.includes("application/json") ||
    contentType.includes("application/json") ||
    xRequestedWith === "XMLHttpRequest";

  // 3) Resposta conforme o tipo de cliente.
  if (isApiRequest) {
    // SEGURANÇA: não revelamos se o usuário existe, apenas que não está
    // autenticado. Mensagem genérica é suficiente.
    res.status(401).json({
      success: false,
      message: "Não autenticado. Faça login para continuar.",
    });
    return;
  }

  // Navegador → redireciona para a tela de login.
  res.redirect("/login");
}