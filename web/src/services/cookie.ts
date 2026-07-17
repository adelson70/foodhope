const TOKEN_KEY = 'token';
const TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 dias

export function getToken(): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${TOKEN_KEY}=`));

  if (!match) return null;

  const value = match.slice(TOKEN_KEY.length + 1);
  return value ? decodeURIComponent(value) : null;
}

export function setToken(token: string): void {
  document.cookie = [
    `${TOKEN_KEY}=${encodeURIComponent(token)}`,
    `Max-Age=${TOKEN_MAX_AGE_SECONDS}`,
    'Path=/',
    'SameSite=Lax',
  ].join('; ');
}

export function clearToken(): void {
  document.cookie = `${TOKEN_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
}
