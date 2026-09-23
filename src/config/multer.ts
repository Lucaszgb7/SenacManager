// src/config/multer.ts
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

/**
 * Configuração do Multer para upload de avatares.
 *
 * PONTOS CRÍTICOS DE SEGURANÇA:
 * - `diskStorage` com destino fixo (nunca derivado do input do usuário)
 *   evita path traversal.
 * - O nome do arquivo é reconstruído a partir do userId + timestamp,
 *   impedindo que o atacante controle a extensão final.
 * - O filtro de MIME rejeita qualquer coisa que não seja jpg/png/webp.
 * - Limite de 2MB evita DoS por disco.
 */

const AVATAR_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "public",
  "uploads",
  "avatars"
);

// Garante que a pasta existe em runtime — evita ENOENT no primeiro upload.
if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO_BYTES = 2 * 1024 * 1024; // 2MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, AVATAR_DIR);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // SEGURANÇA: reconstruímos o nome inteiramente no servidor.
    const userId = req.session?.usuario?.id ?? "anon";
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${userId}-${timestamp}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (TIPOS_PERMITIDOS.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error("TIPO_INVALIDO"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: TAMANHO_MAXIMO_BYTES,
    files: 1,
  },
});

/**
 * Middleware pronto para uso: uploadAvatar.single("avatar")
 */
export const uploadAvatar = upload;

/** Caminho público servido pelo express.static */
export const AVATAR_DIR_PUBLIC_PATH = "/uploads/avatars";