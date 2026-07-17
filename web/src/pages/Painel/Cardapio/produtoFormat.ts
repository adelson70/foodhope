export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function urlImagemProduto(imagemUrl: string | null | undefined): string | null {
  if (!imagemUrl) return null;
  if (imagemUrl.startsWith('http://') || imagemUrl.startsWith('https://')) {
    return imagemUrl;
  }
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';
  return `${base}${imagemUrl.startsWith('/') ? '' : '/'}${imagemUrl}`;
}
