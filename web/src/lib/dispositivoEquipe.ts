// Marca o aparelho como "da equipe" para o PWA abrir no login mesmo sem sessão
// (cookie expirado ou logout). Cookie, e não localStorage, porque o iOS copia
// cookies do Safari para o app instalado. O logout não apaga essa marca.
const COOKIE = 'fh_equipe';
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export function isRotaEquipe(pathname: string): boolean {
  if (pathname.startsWith('/painel/tela-pedidos')) return false;
  return pathname === '/login' || pathname.startsWith('/painel');
}

export function isDispositivoEquipe(): boolean {
  return document.cookie.split('; ').some((row) => row === `${COOKIE}=1`);
}

export function marcarDispositivoEquipe(): void {
  document.cookie = `${COOKIE}=1; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

export function marcarSeRotaEquipe(pathname: string): void {
  if (isRotaEquipe(pathname)) marcarDispositivoEquipe();
}
