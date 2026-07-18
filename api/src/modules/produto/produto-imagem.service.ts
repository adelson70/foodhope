import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import convert from 'heic-convert';
import sharp from 'sharp';

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

const EXT_HEIC = /\.(heic|heif)$/i;
const EXT_IMAGEM = /\.(jpe?g|png|webp|gif|heic|heif)$/i;

@Injectable()
export class ProdutoImagemService {
  private readonly pastaProduto = join(process.cwd(), 'public', 'produto');

  caminhoAbsoluto(produtoId: string) {
    return join(this.pastaProduto, `${produtoId}.webp`);
  }

  urlPublica(produtoId: string) {
    return `/public/produto/${produtoId}.webp`;
  }

  validarArquivo(file: Express.Multer.File) {
    const mime = (file.mimetype || '').toLowerCase();
    const nome = file.originalname || '';

    if (MIME_TIPOS_PERMITIDOS.has(mime)) {
      if (mime === 'application/octet-stream' && !EXT_IMAGEM.test(nome)) {
        throw new BadRequestException(
          'Formato de imagem inválido. Use JPEG, PNG, WebP, GIF ou HEIC.',
        );
      }
      return;
    }

    if (EXT_IMAGEM.test(nome)) return;

    throw new BadRequestException(
      'Formato de imagem inválido. Use JPEG, PNG, WebP, GIF ou HEIC.',
    );
  }

  private ehHeic(file: Express.Multer.File) {
    const mime = (file.mimetype || '').toLowerCase();
    return (
      mime.includes('heic') ||
      mime.includes('heif') ||
      EXT_HEIC.test(file.originalname || '')
    );
  }

  private async bufferParaProcessar(
    file: Express.Multer.File,
  ): Promise<Buffer> {
    if (!this.ehHeic(file)) {
      return file.buffer;
    }

    const convertido = await convert({
      buffer: file.buffer,
      format: 'JPEG',
      quality: 0.9,
    });

    return Buffer.from(convertido);
  }

  async salvar(produtoId: string, file: Express.Multer.File): Promise<string> {
    this.validarArquivo(file);

    try {
      await mkdir(this.pastaProduto, { recursive: true });

      const destino = this.caminhoAbsoluto(produtoId);
      const buffer = await this.bufferParaProcessar(file);

      await sharp(buffer)
        .rotate()
        .resize({
          width: 1200,
          height: 1200,
          fit: 'cover',
          position: 'centre',
          withoutEnlargement: true,
        })
        .webp({ quality: 75, effort: 4 })
        .toFile(destino);

      return this.urlPublica(produtoId);
    } catch (erro) {
      if (erro instanceof BadRequestException) {
        throw erro;
      }

      console.error('Erro ao processar imagem do produto:', erro);
      throw new InternalServerErrorException(
        'Não foi possível processar a imagem do produto.',
      );
    }
  }

  async remover(produtoId: string): Promise<void> {
    try {
      await unlink(this.caminhoAbsoluto(produtoId));
    } catch (erro: any) {
      if (erro?.code !== 'ENOENT') {
        console.error('Erro ao remover imagem do produto:', erro);
      }
    }
  }
}
