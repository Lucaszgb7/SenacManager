import multer from 'multer';
import path from 'path';
export const AVATAR_DIR_PUBLIC_PATH = '/uploads/avatars';
export const avatarDirectory = () => process.env.AVATAR_DIR || path.resolve(__dirname, '../../public/uploads/avatars');
export const uploadAvatar = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg','image/png','image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('TIPO_INVALIDO'));
  }
});
