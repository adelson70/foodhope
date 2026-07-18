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

export async function prepararImagemParaCrop(arquivo: File): Promise<File> {
  const comprimido = await imageCompression(arquivo, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1280,
    useWebWorker: typeof Worker !== 'undefined',
    fileType: 'image/jpeg',
    initialQuality: 0.85,
  });

  return new File([comprimido], 'produto-upload.jpg', {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}
