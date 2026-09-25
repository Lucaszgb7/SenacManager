// src/routes/profileRoutes.ts
import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";

import ProfileController from "../controllers/ProfileController";
import { uploadAvatar } from "../config/multer";
import { autenticado } from "../middlewares/authMiddleware";

const profileRoutes = Router();

/**
 * Wrapper para tratar erros do Multer ANTES de chegar no controller.
 * Sem isso, um upload grande demais viraria um 500 genérico em HTML,
 * quebrando o fetch() do front (que espera JSON).
 */
function tratarErrosMulter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  uploadAvatar.single("avatar")(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }

    // Erro identificado pelo fileFilter do multer.ts
    if (err instanceof Error && err.message === "TIPO_INVALIDO") {
      res.status(415).json({
        success: false,
        message: "Formato inválido. Envie uma imagem JPG, PNG ou WEBP.",
      });
      return;
    }

    // Erros nativos do Multer
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({
          success: false,
          message: "Arquivo muito grande. O tamanho máximo é 2MB.",
        });
        return;
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        res.status(400).json({
          success: false,
          message: "Envie apenas um arquivo por vez.",
        });
        return;
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        res.status(400).json({
          success: false,
          message: 'Campo de arquivo inesperado. Use o campo "avatar".',
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: `Falha no upload: ${err.message}`,
      });
      return;
    }

    // Erro desconhecido — delega para o errorMiddleware global.
    next(err);
  });
}

profileRoutes.get(
  "/profile",
  autenticado,
  ProfileController.verPerfil.bind(ProfileController)
);

profileRoutes.put(
  "/profile",
  autenticado,
  ProfileController.atualizarInfo.bind(ProfileController)
);

profileRoutes.put(
  "/profile/senha",
  autenticado,
  ProfileController.alterarSenha.bind(ProfileController)
);

profileRoutes.post(
  "/profile/foto",
  autenticado,
  tratarErrosMulter,
  ProfileController.uploadFoto.bind(ProfileController)
);


export default profileRoutes;