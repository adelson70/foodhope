export const APP_VERSION =
  import.meta.env.VITE_APP_VERSION?.trim() || '1.0.0';

export const APP_GIT_SHA = (() => {
  const raw = import.meta.env.VITE_GIT_SHA?.trim();
  if (!raw) return 'dev';
  return raw;
})();

export const APP_GIT_SHA_CURTO =
  APP_GIT_SHA === 'dev' ? 'dev' : APP_GIT_SHA.slice(0, 7);
