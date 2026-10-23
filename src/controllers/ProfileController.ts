
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { userModel } from '../services/SchoolService';

type ProfileMessage = {
  type: 'success' | 'error';
  text: string;
} | null;

const sanitize = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidPassword = (password: string): boolean =>
  password.length >= 8 &&
  /[A-Za-z]/.test(password) &&
  /\d/.test(password);

const getSession = (req: Request): any => req.session as any;

const setMessage = (
  req: Request,
  type: 'success' | 'error',
  text: string
): void => {
  getSession(req).profileMessage = { type, text } satisfies ProfileMessage;
};

const avatarDirectory = path.resolve(
  __dirname,
  '..',
  '..',
  'public',
  'uploads',
  'avatars'
);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      fs.mkdirSync(avatarDirectory, { recursive: true });
      cb(null, avatarDirectory);
    } catch (error) {
      cb(error as Error, avatarDirectory);
    }
  },

  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

    if (!allowedExtensions.includes(ext)) {
      return cb(new Error('Extensão de arquivo inválida.'), '');
    }

    const filename =
      `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;

    cb(null, filename);
  },
});

export const uploadAvatar = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error('Formato inválido. Use JPG, PNG ou WEBP.')
      );
    }

    cb(null, true);
  },
}).single('avatar');

/**
 * GET /profile
 * Exibe o perfil do usuário autenticado.
 */
export const getProfile = async (
  req: Request,
  res: Response
) => {
  const session = getSession(req);

  try {
    const userId = session.user?.id;

    if (!userId) {
      return res.redirect('/login');
    }

    const user = await (userModel as any).findById(userId);

    if (!user) {
      session.user = null;
      return res.redirect('/login');
    }

    const message = session.profileMessage ?? null;
    delete session.profileMessage;

    return res.render('profile/profile', {
      user,
      message,
      activePage: 'profile',
    });
  } catch (error) {
    console.error('[ProfileController.getProfile]', error);

    return res.status(500).render('profile/profile', {
      user: null,
      message: {
        type: 'error',
        text: 'Erro ao carregar perfil.',
      },
      activePage: 'profile',
    });
  }
};

/**
 * POST /profile/info
 * Atualiza nome e e-mail do usuário autenticado.
 */
export const updateInfo = async (
  req: Request,
  res: Response
) => {
  const session = getSession(req);
  const userId = session.user?.id;

  if (!userId) {
    return res.redirect('/login');
  }

  const name = sanitize(req.body?.name);
  const email = sanitize(req.body?.email).toLowerCase();

  if (!name || !email) {
    setMessage(
      req,
      'error',
      'Nome e e-mail são obrigatórios.'
    );
    return res.redirect('/profile');
  }

  if (!isValidEmail(email)) {
    setMessage(req, 'error', 'E-mail inválido.');
    return res.redirect('/profile');
  }

  try {
    const existingUser = await (userModel as any)
      .findOne({
        email,
        _id: { $ne: userId },
      })
      .lean();

    if (existingUser) {
      setMessage(
        req,
        'error',
        'Este e-mail já está em uso por outro usuário.'
      );
      return res.redirect('/profile');
    }

    const result = await (userModel as any).updateOne(
      { _id: userId },
      { $set: { name, email } }
    );

    if (result.matchedCount === 0) {
      session.user = null;
      return res.redirect('/login');
    }

    session.user.name = name;
    session.user.email = email;

    setMessage(
      req,
      'success',
      'Dados atualizados com sucesso!'
    );

    return res.redirect('/profile');
  } catch (error) {
    console.error('[ProfileController.updateInfo]', error);

    setMessage(
      req,
      'error',
      'Não foi possível salvar os dados. Tente novamente.'
    );

    return res.redirect('/profile');
  }
};

/**
 * POST /profile/password
 * Altera a senha após verificar a senha atual.
 */
export const updatePassword = async (
  req: Request,
  res: Response
) => {
  const session = getSession(req);
  const userId = session.user?.id;

  if (!userId) {
    return res.redirect('/login');
  }

  // Não aplique trim às senhas: espaços podem fazer parte delas.
  const currentPassword =
    typeof req.body?.currentPassword === 'string'
      ? req.body.currentPassword
      : '';

  const newPassword =
    typeof req.body?.newPassword === 'string'
      ? req.body.newPassword
      : '';

  const confirmPassword =
    typeof req.body?.confirmPassword === 'string'
      ? req.body.confirmPassword
      : '';

  if (!currentPassword || !newPassword || !confirmPassword) {
    setMessage(
      req,
      'error',
      'Preencha todos os campos de senha.'
    );
    return res.redirect('/profile');
  }

  if (newPassword !== confirmPassword) {
    setMessage(
      req,
      'error',
      'A nova senha e a confirmação não coincidem.'
    );
    return res.redirect('/profile');
  }

  if (!isValidPassword(newPassword)) {
    setMessage(
      req,
      'error',
      'A nova senha deve ter no mínimo 8 caracteres, incluindo letras e números.'
    );
    return res.redirect('/profile');
  }

  try {
    const user = await (userModel as any).findById(userId);

    if (!user) {
      session.user = null;
      return res.redirect('/login');
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!passwordMatches) {
      setMessage(req, 'error', 'Senha atual incorreta.');
      return res.redirect('/profile');
    }

    const samePassword = await bcrypt.compare(
      newPassword,
      user.password
    );

    if (samePassword) {
      setMessage(
        req,
        'error',
        'A nova senha deve ser diferente da atual.'
      );
      return res.redirect('/profile');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await (userModel as any).updateOne(
      { _id: userId },
      { $set: { password: passwordHash } }
    );

    setMessage(
      req,
      'success',
      'Senha alterada com sucesso!'
    );

    return res.redirect('/profile');
  } catch (error) {
    console.error('[ProfileController.updatePassword]', error);

    setMessage(
      req,
      'error',
      'Erro ao alterar a senha. Tente novamente.'
    );

    return res.redirect('/profile');
  }
};

/**
 * POST /profile/avatar
 * Atualiza a foto de perfil.
 */
export const updateAvatar = async (
  req: Request,
  res: Response
) => {
  const session = getSession(req);
  const userId = session.user?.id;

  if (!userId) {
    if (req.file) {
      fs.promises.unlink(req.file.path).catch(() => undefined);
    }

    return res.redirect('/login');
  }

  if (!req.file) {
    setMessage(
      req,
      'error',
      'Nenhum arquivo enviado ou formato inválido.'
    );
    return res.redirect('/profile');
  }

  try {
    const user = await (userModel as any).findById(userId);

    if (!user) {
      await fs.promises.unlink(req.file.path).catch(() => undefined);
      session.user = null;
      return res.redirect('/login');
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    const oldAvatar = user.avatar;
    user.avatar = avatarPath;
    await user.save();

    session.user.avatar = avatarPath;

    // Remove somente arquivos antigos localizados no diretório
    // de avatares, sem permitir caminhos arbitrários.
    if (oldAvatar) {
      const oldFilename = path.basename(oldAvatar);
      const oldPath = path.resolve(
        avatarDirectory,
        oldFilename
      );

      const isInsideAvatarDirectory =
        path.dirname(oldPath) === avatarDirectory;

      const isManagedAvatar =
        oldAvatar.startsWith('/uploads/avatars/') &&
        oldFilename === oldAvatar.split('/').pop();

      if (
        isInsideAvatarDirectory &&
        isManagedAvatar &&
        oldPath !== path.resolve(req.file.path)
      ) {
        await fs.promises.unlink(oldPath).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') {
            console.error(
              '[ProfileController.updateAvatar] Falha ao remover avatar antigo:',
              error
            );
          }
        });
      }
    }

    setMessage(
      req,
      'success',
      'Foto atualizada com sucesso!'
    );

    return res.redirect('/profile');
  } catch (error) {
    console.error('[ProfileController.updateAvatar]', error);

    // Remove o arquivo recém-enviado caso a operação falhe.
    await fs.promises.unlink(req.file.path).catch(() => undefined);

    setMessage(
      req,
      'error',
      'Erro ao enviar a foto. Tente novamente.'
    );

    return res.redirect('/profile');
  }
};

/**
 * Middleware para tratar erros do Multer.
 * Registre depois do middleware de upload na rota.
 */
export const handleAvatarError = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (!err) {
    return res.redirect('/profile');
  }

  const session = getSession(req);

  let message = 'Falha no upload da imagem.';

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'A imagem deve ter no máximo 2 MB.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Campo de arquivo inválido. Use o campo avatar.';
    } else {
      message = 'Erro durante o envio da imagem.';
    }
  } else if (err instanceof Error) {
    message = err.message;
  }

  session.profileMessage = {
    type: 'error',
    text: message,
  };

  return res.redirect('/profile');
};
