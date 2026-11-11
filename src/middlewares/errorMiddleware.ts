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

  const isMulterSize = (err as any)?.code === 'LIMIT_FILE_SIZE';
  const isTipoInvalido = err?.message === 'TIPO_INVALIDO';

  let status =
    err instanceof HttpError
      ? err.status
      : typeof (err as Error & { status?: number }).status === 'number'
        ? (err as Error & { status: number }).status
        : 500;

  if (isMulterSize) status = 413;
  if (isTipoInvalido) status = 415;

  const codigo = status >= 400 && status <= 599 ? status : 500;
  const mensagem =
    isMulterSize
      ? 'O arquivo enviado excede o limite máximo permitido de 2 MB.'
      : isTipoInvalido
        ? 'Formato inválido. Envie uma imagem JPG, PNG ou WEBP.'
        : codigo < 500 || codigo === 503
          ? err.message
          : 'Erro interno do servidor. Tente novamente mais tarde.';

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

  res.status(codigo).render(
    "errors/error",
    { status: codigo, message: mensagem },
    (renderErr, html) => {
      if (renderErr) {
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
        return;
      }
      res.send(html);
    }
  );
}
