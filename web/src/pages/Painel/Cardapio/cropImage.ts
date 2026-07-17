export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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
  fileName = 'produto.png',
): Promise<File> {
  const image = await carregarImagem(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: true });

  if (!ctx) {
    throw new Error('Canvas não disponível neste navegador.');
  }

  const size = Math.max(
    1,
    Math.round(Math.min(pixelCrop.width, pixelCrop.height)),
  );
  canvas.width = size;
  canvas.height = size;
  ctx.clearRect(0, 0, size, size);

  const srcX = Math.max(0, pixelCrop.x);
  const srcY = Math.max(0, pixelCrop.y);
  const srcRight = Math.min(
    image.naturalWidth,
    pixelCrop.x + pixelCrop.width,
  );
  const srcBottom = Math.min(
    image.naturalHeight,
    pixelCrop.y + pixelCrop.height,
  );
  const srcW = srcRight - srcX;
  const srcH = srcBottom - srcY;

  if (srcW > 0 && srcH > 0) {
    const scaleX = size / pixelCrop.width;
    const scaleY = size / pixelCrop.height;
    const destX = (srcX - pixelCrop.x) * scaleX;
    const destY = (srcY - pixelCrop.y) * scaleY;
    const destW = srcW * scaleX;
    const destH = srcH * scaleY;

    ctx.drawImage(
      image,
      srcX,
      srcY,
      srcW,
      srcH,
      destX,
      destY,
      destW,
      destH,
    );
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (resultado) => {
        if (!resultado) {
          reject(new Error('Não foi possível gerar a imagem cortada.'));
          return;
        }
        resolve(resultado);
      },
      'image/png',
    );
  });

  return new File([blob], fileName, { type: 'image/png' });
}
