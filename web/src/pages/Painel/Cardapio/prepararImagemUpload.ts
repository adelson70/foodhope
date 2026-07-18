import imageCompression from 'browser-image-compression';

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

export function arquivoImagemAceito(arquivo: File): boolean {
  const tipo = (arquivo.type || '').toLowerCase();
  if (MIME_PERMITIDOS.has(tipo)) return true;
  if (tipo && tipo !== 'application/octet-stream') return false;
  return EXT_PERMITIDAS.test(arquivo.name);
}

async function materializarArquivo(arquivo: File): Promise<File> {
  const buffer = await arquivo.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error('Arquivo vazio ou inacessível.');
  }

  const tipo = arquivo.type || 'application/octet-stream';
  return new File([buffer], arquivo.name || 'imagem', {
    type: tipo,
    lastModified: Date.now(),
  });
}

export async function prepararImagemParaCrop(arquivo: File): Promise<File> {
  const original = await materializarArquivo(arquivo);

  try {
    const comprimido = await imageCompression(original, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 1600,
      useWebWorker: false,
      fileType: 'image/jpeg',
      initialQuality: 0.85,
    });

    if (comprimido.size > 0) {
      return new File([comprimido], 'produto-upload.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    }
  } catch {
    return original;
  }

  return original;
}
