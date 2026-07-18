export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MAX_OUTPUT = 1200;
const JPEG_QUALITY = 0.82;

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () =>
      reject(new Error('Não foi possível carregar a imagem.')),
    );
    image.src = src;
  });
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea,
  fileName = 'produto.jpg',
): Promise<File> {
  const image = await carregarImagem(imageSrc);

  const side = Math.max(1, Math.min(pixelCrop.width, pixelCrop.height));
  const size = Math.max(1, Math.min(MAX_OUTPUT, Math.round(side)));

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Canvas não disponível neste navegador.');
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const srcX = pixelCrop.x + (pixelCrop.width - side) / 2;
  const srcY = pixelCrop.y + (pixelCrop.height - side) / 2;

  ctx.drawImage(image, srcX, srcY, side, side, 0, 0, size, size);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (resultado) => {
        if (!resultado) {
          reject(new Error('Não foi possível gerar a imagem cortada.'));
          return;
        }
        resolve(resultado);
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  });

  return new File([blob], fileName, { type: 'image/jpeg' });
}
