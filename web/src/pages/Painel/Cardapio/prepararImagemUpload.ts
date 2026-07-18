const MIME_PERMITIDOS = new Set([
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
]);

const EXT_PERMITIDAS = /\.(jpe?g|png|webp|gif|heic|heif)$/i;
const MAX_LADO = 1600;
const JPEG_QUALITY = 0.88;

export function arquivoImagemAceito(arquivo: File): boolean {
  const tipo = (arquivo.type || '').toLowerCase();
  if (MIME_PERMITIDOS.has(tipo)) return true;
  if (tipo && tipo !== 'application/octet-stream') return false;
  return EXT_PERMITIDAS.test(arquivo.name);
}

function canvasParaJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const falhou = () =>
      reject(new Error('Não foi possível comprimir a imagem.'));

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
      // Safari antigo: cai no data URL
    }

    viaDataUrl();

    function viaDataUrl() {
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
    }
  });
}

async function carregarFonte(
  arquivo: File,
): Promise<{ fonte: CanvasImageSource; largura: number; altura: number; liberar: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(arquivo);
      return {
        fonte: bitmap,
        largura: bitmap.width,
        altura: bitmap.height,
        liberar: () => bitmap.close(),
      };
    } catch {
      // iOS/HEIC ou Safari sem suporte: tenta <img>
    }
  }

  const url = URL.createObjectURL(arquivo);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error('Não foi possível ler a imagem neste dispositivo.'));
      img.src = url;
    });

    return {
      fonte: image,
      largura: image.naturalWidth || image.width,
      altura: image.naturalHeight || image.height,
      liberar: () => URL.revokeObjectURL(url),
    };
  } catch (erro) {
    URL.revokeObjectURL(url);
    throw erro;
  }
}

export async function prepararImagemParaCrop(arquivo: File): Promise<File> {
  const { fonte, largura, altura, liberar } = await carregarFonte(arquivo);

  try {
    if (!largura || !altura) {
      throw new Error('Não foi possível ler a imagem neste dispositivo.');
    }

    const escala = Math.min(1, MAX_LADO / Math.max(largura, altura));
    const destinoLargura = Math.max(1, Math.round(largura * escala));
    const destinoAltura = Math.max(1, Math.round(altura * escala));

    const canvas = document.createElement('canvas');
    canvas.width = destinoLargura;
    canvas.height = destinoAltura;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Canvas não disponível neste navegador.');
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, destinoLargura, destinoAltura);
    ctx.drawImage(fonte, 0, 0, destinoLargura, destinoAltura);

    const blob = await canvasParaJpeg(canvas);
    return new File([blob], 'produto-upload.jpg', { type: 'image/jpeg' });
  } finally {
    liberar();
  }
}
