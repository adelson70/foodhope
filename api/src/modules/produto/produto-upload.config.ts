import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

const MIME_TIPOS_PERMITIDOS = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
  'application/octet-stream',
]);

const EXT_IMAGEM = /\.(jpe?g|png|webp|gif|heic|heif)$/i;

export const produtoImagemUploadOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const mime = (file.mimetype || '').toLowerCase();
    const nome = file.originalname || '';

    if (MIME_TIPOS_PERMITIDOS.has(mime)) {
      if (mime === 'application/octet-stream' && !EXT_IMAGEM.test(nome)) {
        return callback(
          new BadRequestException(
            'Formato de imagem inválido. Use JPEG, PNG, WebP, GIF ou HEIC.',
          ),
          false,
        );
      }
      return callback(null, true);
    }

    if (EXT_IMAGEM.test(nome)) {
      return callback(null, true);
    }

    return callback(
      new BadRequestException(
        'Formato de imagem inválido. Use JPEG, PNG, WebP, GIF ou HEIC.',
      ),
      false,
    );
  },
};
