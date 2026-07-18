export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MAX_OUTPUT = 1024;
const JPEG_QUALITY = 0.82;

function liberarCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

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

function canvasParaJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const falhou = () =>
      reject(new Error('Não foi possível gerar a imagem cortada.'));

    const viaDataUrl = () => {
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        if (!dataUrl.startsWith('data:image/jpeg')) {
          falhou();
          return;
        }
        const [, base64] = dataUrl.split(',');
        if (!base64) {
          falhou();
          return;
        }
        const binario = atob(base64);
        const bytes = new Uint8Array(binario.length);
        for (let i = 0; i < binario.length; i += 1) {
          bytes[i] = binario.charCodeAt(i);
        }
        resolve(new Blob([bytes], { type: 'image/jpeg' }));
      } catch {
        falhou();
      }
    };

    try {
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob(
          (resultado) => {
            if (resultado && resultado.size > 0) {
              resolve(resultado);
              return;
            }
            viaDataUrl();
          },
          'image/jpeg',
          JPEG_QUALITY,
        );
        return;
      }
    } catch {
      // Safari: cai no data URL
    }

    viaDataUrl();
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
    liberarCanvas(canvas);
    throw new Error('Canvas não disponível neste navegador.');
  }

  try {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const srcX = pixelCrop.x + (pixelCrop.width - side) / 2;
    const srcY = pixelCrop.y + (pixelCrop.height - side) / 2;

    ctx.drawImage(image, srcX, srcY, side, side, 0, 0, size, size);

    const blob = await canvasParaJpeg(canvas);
    return new File([blob], fileName, { type: 'image/jpeg' });
  } finally {
    liberarCanvas(canvas);
  }
}
