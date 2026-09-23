// src/middlewares/perfilMiddleware.ts
import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Fábrica `permitirPerfis`
 * -----------------------------------------------------------------
 * Uso:
 *   router.get('/admin', autenticado, permitirPerfis('administrador'), handler);
 *
 * FLUXO:
 *   1. Recebe uma lista variádica de perfis permitidos.
 *   2. Retorna um middleware que:
 *      a. Confere se há usuário na sessão (defesa em profundidade —
 *         normalmente `autenticado` já rodou antes, mas não confiamos
 *         na ordem das rotas).
 *      b. Verifica se `req.session.usuario.perfil` está na lista.
 *      c. Se sim → next().
 *      d. Se não → responde 403 (Forbidden) em JSON ou HTML amigável.
 *
 * SEGURANÇA:
 *   - A decisão é SEMPRE baseada no perfil guardado na sessão do
 *     servidor — nunca em algo enviado pelo cliente (query, body, header).
 *   - 403 (e não 401) é o status correto: o usuário está autenticado,
 *     apenas não tem permissão para aquele recurso.
 */
export function permitirPerfis(...perfis: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // (a) Defesa em profundidade: garante que existe sessão de usuário.
    const usuario = req.session?.usuario;
    if (!usuario) {
      // Se for API → 401; se for navegador → manda para login.
      const acceptHeader = req.headers["accept"] ?? "";
      const contentType = req.headers["content-type"] ?? "";
      const isApiRequest =
        acceptHeader.includes("application/json") ||
        contentType.includes("application/json");

      if (isApiRequest) {
        res.status(401).json({
          success: false,
          message: "Não autenticado. Faça login para continuar.",
        });
        return;
      }
      res.redirect("/login");
      return;
    }

    // (b) Checa se o perfil do usuário está na lista de permitidos.
    if (perfis.includes(usuario.perfil)) {
      return next();
    }

    // (c) Autenticado, mas sem permissão → 403.
    const acceptHeader = req.headers["accept"] ?? "";
    const contentType = req.headers["content-type"] ?? "";
    const isApiRequest =
      acceptHeader.includes("application/json") ||
      contentType.includes("application/json");

    if (isApiRequest) {
      res.status(403).json({
        success: false,
        message: "Você não tem permissão para acessar esta área.",
      });
      return;
    }

    // Resposta HTML amigável para navegador.
    // Se existir uma view dedicada (ex.: views/errors/403.ejs), usar ela.
    // Caso contrário, devolvemos um HTML mínimo com o status correto.
    res
      .status(403)
      .send(
        `<!DOCTYPE html>
<html lang="pt-br">
  <head>
    <meta charset="UTF-8" />
    <title>Acesso negado — SenacManager</title>
  </head>
  <body style="font-family: sans-serif; text-align: center; padding: 60px;">
    <h1>403 — Acesso negado</h1>
    <p>Você não tem permissão para acessar esta área.</p>
    <a href="/dashboard">Voltar para o dashboard</a>
  </body>
</html>`
      );
  };
}