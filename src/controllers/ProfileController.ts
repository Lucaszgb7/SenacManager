import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { updateProfile, changePassword, setAvatar } from '../services/SchoolService';
import { HttpError } from '../services/validation';
import { avatarDirectory, AVATAR_DIR_PUBLIC_PATH } from '../config/multer';

function imageExtension(buffer: Buffer, mime: string): string {
  if (mime === 'image/png' && buffer.length > 24 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && buffer.toString('ascii',12,16) === 'IHDR') return '.png';
  if (mime === 'image/jpeg' && buffer.length > 4 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 && buffer[buffer.length - 2] === 255 && buffer[buffer.length - 1] === 217) return '.jpg';
  if (mime === 'image/webp' && buffer.length > 20 && buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP' && buffer.readUInt32LE(4) + 8 === buffer.length) return '.webp';
  throw new HttpError(415, 'O conteúdo do arquivo não corresponde a uma imagem JPG, PNG ou WEBP.');
}
export class ProfileController {
  verPerfil = async (_req: Request, res: Response): Promise<void> => { res.render('profile/profile'); };
  atualizarInfo = async (req: Request, res: Response): Promise<void> => {
    const usuario = await updateProfile(req.session.usuario!.id, req.body || {});
    req.session.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil };
    res.json({ success: true, message: 'Dados atualizados.', usuario });
  };
  alterarSenha = async (req: Request, res: Response): Promise<void> => {
    await changePassword(req.session.usuario!.id, req.body?.senhaAtual, req.body?.novaSenha);
    res.json({ success: true, message: 'Senha alterada.' });
  };
  uploadFoto = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) throw new HttpError(400, 'Selecione uma imagem.');
    const ext = imageExtension(req.file.buffer, req.file.mimetype);
    const directory = avatarDirectory();
    await fs.mkdir(directory, { recursive: true });
    const filename = randomUUID() + ext;
    const destination = path.join(directory, filename);
    await fs.writeFile(destination, req.file.buffer, { flag: 'wx' });
    let previous: string | null;
    try { previous = await setAvatar(req.session.usuario!.id, AVATAR_DIR_PUBLIC_PATH + '/' + filename); }
    catch (error) { await fs.unlink(destination).catch(() => undefined); throw error; }
    if (previous?.startsWith(AVATAR_DIR_PUBLIC_PATH + '/')) {
      const basename = previous.slice(AVATAR_DIR_PUBLIC_PATH.length + 1);
      if (basename === path.basename(basename) && !basename.includes('..')) await fs.unlink(path.join(directory, basename)).catch(() => undefined);
    }
    res.json({ success: true, message: 'Foto atualizada.', fotoUrl: AVATAR_DIR_PUBLIC_PATH + '/' + filename });
  };
}
export default new ProfileController();
