import { Request, Response, NextFunction } from "express";
import { HttpError } from "../services/validation";

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(
    `[ErrorMiddleware] ${req.method} ${req.originalUrl}:`,
    err.message
  );

  if (res.headersSent) return;

  const status =
    err instanceof HttpError
      ? err.status
      : typeof (err as Error & { status?: number }).status === "number"
        ? (err as Error & { status: number }).status
        : 500;

  const codigo = status >= 400 && status <= 599 ? status : 500;
  const mensagem =
    codigo < 500
      ? err.message
      : "Erro interno do servidor. Tente novamente mais tarde.";

  const accept = req.headers.accept ?? "";
  const contentType = req.headers["content-type"] ?? "";
  const esperaJson =
    accept.includes("application/json") ||
    contentType.includes("application/json");

  if (esperaJson) {
    res.status(codigo).json({
      success: false,
      message: mensagem,
    });
    return;
  }

  res.status(codigo).send(
    `<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<title>Erro ${codigo} — SenacManager</title>
</head>
<body style="font-family:sans-serif;text-align:center;padding:60px">
<h1>${codigo} — ${codigo === 500 ? "Erro interno" : "Não foi possível concluir a solicitação"}</h1>
<p>${mensagem.replace(/[&<>"']/g, (char) => {
      const entidades: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entidades[char] ?? char;
    })}</p>
<a href="/dashboard">Voltar para o dashboard</a>
</body>
</html>`
  );
}
