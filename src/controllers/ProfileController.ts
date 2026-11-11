import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { avatarDirectory, AVATAR_DIR_PUBLIC_PATH } from '../config/multer';
import { changePassword, setAvatar, updateProfile } from '../services/SchoolService';
import { HttpError } from '../services/validation';

export const avatarExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Validação rigorosa de assinatura binária (magic numbers) e integridade de imagens.
 * Rejeita executáveis, scripts embutidos (PHP/JS/HTML) e arquivos corrompidos.
 */
export function hasValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (!buffer || buffer.length < 12) return false;

  // 1. Rejeição de executáveis conhecidos
  // Assinatura Windows PE (MZ)
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) return false;
  // Assinatura Linux ELF
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) return false;
  // Assinatura Shell Script (#!...)
  if (buffer[0] === 0x23 && buffer[1] === 0x21) return false;

  // 2. Rejeição de scripts embutidos / HTML injection
  const headStr = buffer.toString('utf8', 0, Math.min(buffer.length, 512)).toLowerCase();
  const dangerousPatterns = ['<script', '<?php', '<%', '<!doctype', '<html', 'eval(', '/bin/sh', 'powershell'];
  if (dangerousPatterns.some(p => headStr.includes(p))) {
    return false;
  }

  // 3. Validação estrita por formato
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimeType === 'image/webp') {
    return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  }

  return false;
}

function currentUserId(req: Request): string {
  const userId = req.session.usuario?.id;
  if (!userId) throw new HttpError(401, 'Não autenticado. Faça login para continuar.');
  return userId;
}

function managedAvatarPath(url: string | null | undefined): string | undefined {
  if (!url || !url.startsWith(`${AVATAR_DIR_PUBLIC_PATH}/`)) return undefined;

  const filename = url.slice(`${AVATAR_DIR_PUBLIC_PATH}/`.length);
  if (!filename || path.basename(filename) !== filename) return undefined;

  const directory = path.resolve(avatarDirectory());
  const resolved = path.resolve(directory, filename);
  return path.dirname(resolved) === directory ? resolved : undefined;
}

class ProfileController {
  async verPerfil(_req: Request, res: Response): Promise<void> {
    res.render('profile/profile', { usuario: res.locals.usuario });
  }

  async atualizarInfo(req: Request, res: Response): Promise<void> {
    const userId = currentUserId(req);
    const updated = await updateProfile(userId, req.body || {});

    req.session.usuario = {
      id: updated.id,
      nome: updated.nome,
      email: updated.email,
      perfil: updated.perfil,
    };

    res.json({ success: true, message: 'Dados atualizados com sucesso.' });
  }

  async alterarSenha(req: Request, res: Response): Promise<void> {
    const userId = currentUserId(req);
    const { senhaAtual, novaSenha, confirmarSenha } = req.body || {};

    if (confirmarSenha !== undefined && confirmarSenha !== novaSenha) {
      throw new HttpError(400, 'A nova senha e a confirmação não coincidem.');
    }

    await changePassword(userId, senhaAtual, novaSenha);
    res.json({ success: true, message: 'Senha alterada com sucesso.' });
  }

  async uploadFoto(req: Request, res: Response): Promise<void> {
    const userId = currentUserId(req);
    const file = req.file;
    const extension = file && avatarExtensions[file.mimetype];

    if (!file || !extension || !hasValidImageSignature(file.buffer, file.mimetype)) {
      throw new HttpError(415, 'Formato inválido. Envie uma imagem JPG, PNG ou WEBP.');
    }

    const directory = path.resolve(avatarDirectory());
    await fs.mkdir(directory, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    const newPath = path.resolve(directory, filename);
    const fotoUrl = `${AVATAR_DIR_PUBLIC_PATH}/${filename}`;
    await fs.writeFile(newPath, file.buffer, { flag: 'wx' });

    let previousAvatar: string | null | undefined;
    try {
      previousAvatar = await setAvatar(userId, fotoUrl);
    } catch (error) {
      await fs.unlink(newPath).catch(() => undefined);
      throw error;
    }

    const oldPath = managedAvatarPath(previousAvatar);
    if (oldPath && oldPath !== newPath) {
      await fs.unlink(oldPath).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') {
          console.error('[ProfileController.uploadFoto] Não foi possível remover a foto anterior:', error);
        }
      });
    }

    res.json({ success: true, message: 'Foto atualizada com sucesso.', fotoUrl });
  }
}

export default new ProfileController();
