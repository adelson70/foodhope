import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const MIME_TIPOS_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

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
    if (!MIME_TIPOS_PERMITIDOS.has(file.mimetype)) {
      throw new BadRequestException(
        'Formato de imagem inválido. Use JPEG, PNG, WebP ou GIF.',
      );
    }
  }

  async salvar(produtoId: string, file: Express.Multer.File): Promise<string> {
    this.validarArquivo(file);

    try {
      await mkdir(this.pastaProduto, { recursive: true });

      const destino = this.caminhoAbsoluto(produtoId);

      await sharp(file.buffer)
        .rotate()
        .resize({
          width: 1200,
          height: 1200,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
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
