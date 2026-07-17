export function urlImagemProduto(
  imagemUrl: string | null | undefined,
  cacheKey?: string | number | null,
): string | null {
  if (!imagemUrl) return null;

  let url: string;
  if (imagemUrl.startsWith('http://') || imagemUrl.startsWith('https://')) {
    url = imagemUrl;
  } else {
    const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';
    url = `${base}${imagemUrl.startsWith('/') ? '' : '/'}${imagemUrl}`;
  }

  if (cacheKey == null || cacheKey === '') return url;

  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(String(cacheKey))}`;
}
