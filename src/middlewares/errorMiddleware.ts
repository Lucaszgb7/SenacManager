// src/middlewares/errorMiddleware.ts
import { Request, Response, NextFunction } from "express";

/**
 * Middleware global de tratamento de erros
 * -----------------------------------------------------------------
 * IMPORTANTE: no Express, um middleware só é reconhecido como
 * tratador de erros se declarar EXATAMENTE 4 parâmetros
 * (err, req, res, next) — mesmo que `next` não seja usado.
 *
 * FLUXO:
 *   1. Qualquer erro lançado (ou repassado via next(err)) em
 *      controllers/middlewares anteriores cai aqui.
 *   2. Logamos o erro completo no servidor (console) para diagnóstico.
 *   3. Respondemos ao cliente com status 500 e mensagem GENÉRICA —
 *      nunca expor stack trace, queries SQL ou nomes de tabelas.
 *
 * SEGURANÇA:
 *   - Em produção, detalhes internos viram informação valiosa para
 *     atacantes (fingerprinting, enumeração de schema, etc.).
 *   - Diferenciar o log (detalhado, interno) da resposta (genérica,
 *     pública) é a prática recomendada.
 */
export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // 1) Log interno detalhado. Aqui sim queremos ver tudo.
  console.error("[ErrorMiddleware] Requisição falhou:");
  console.error(`  Rota: ${req.method} ${req.originalUrl}`);
  console.error(`  Mensagem: ${err.message}`);
  console.error(`  Stack: ${err.stack}`);

  // 2) Se os headers já foram enviados, não há como responder de novo.
  //    Delegamos ao handler padrão do Express para encerrar a conexão.
  if (res.headersSent) {
    return;
  }

  // 3) Detecta se o cliente espera JSON (API/fetch) ou HTML (navegador).
  const acceptHeader = req.headers["accept"] ?? "";
  const contentType = req.headers["content-type"] ?? "";
  const isApiRequest =
    acceptHeader.includes("application/json") ||
    contentType.includes("application/json");

  // 4) Resposta genérica — sem detalhes internos.
  if (isApiRequest) {
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor. Tente novamente mais tarde.",
    });
    return;
  }

  res
    .status(500)
    .send(
      `<!DOCTYPE html>
<html lang="pt-br">
  <head>
    <meta charset="UTF-8" />
    <title>Erro interno — SenacManager</title>
  </head>
  <body style="font-family: sans-serif; text-align: center; padding: 60px;">
    <h1>500 — Erro interno</h1>
    <p>Algo deu errado. Tente novamente mais tarde.</p>
    <a href="/dashboard">Voltar para o dashboard</a>
  </body>
</html>`
    );
}