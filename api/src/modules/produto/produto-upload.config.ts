import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

const MIME_TIPOS_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

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
    if (!MIME_TIPOS_PERMITIDOS.has(file.mimetype)) {
      return callback(
        new BadRequestException(
          'Formato de imagem inválido. Use JPEG, PNG, WebP ou GIF.',
        ),
        false,
      );
    }

    callback(null, true);
  },
};
