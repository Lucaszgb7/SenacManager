import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { avatarDirectory, AVATAR_DIR_PUBLIC_PATH } from '../config/multer';
import { changePassword, setAvatar, updateProfile } from '../services/SchoolService';
import { HttpError } from '../services/validation';

const avatarExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function hasValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  return mimeType === 'image/webp' && buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
}

function currentUserId(req: Request): string {
  const userId = req.session.usuario?.id;
  if (!userId) throw new HttpError(401, 'NÃ£o autenticado. FaÃ§a login para continuar.');
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
      throw new HttpError(400, 'A nova senha e a confirmaÃ§Ã£o nÃ£o coincidem.');
    }

    await changePassword(userId, senhaAtual, novaSenha);
    res.json({ success: true, message: 'Senha alterada com sucesso.' });
  }

  async uploadFoto(req: Request, res: Response): Promise<void> {
    const userId = currentUserId(req);
    const file = req.file;
    const extension = file && avatarExtensions[file.mimetype];

    if (!file || !extension || !hasValidImageSignature(file.buffer, file.mimetype)) {
      throw new HttpError(415, 'Formato invÃ¡lido. Envie uma imagem JPG, PNG ou WEBP.');
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
          console.error('[ProfileController.uploadFoto] NÃ£o foi possÃ­vel remover a foto anterior:', error);
        }
      });
    }

    res.json({ success: true, message: 'Foto atualizada com sucesso.', fotoUrl });
  }
}

export default new ProfileController();
