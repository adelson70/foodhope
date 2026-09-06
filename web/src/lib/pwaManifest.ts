const MANIFEST_CLIENTE = '/manifest.webmanifest';
const MANIFEST_PAINEL = '/manifest-painel.webmanifest';
const MANIFEST_LINK_ID = 'foodhope-pwa-manifest';

export function isPwaPainelPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/painel');
}

function ensureManifestLink(): HTMLLinkElement {
  let link = document.getElementById(MANIFEST_LINK_ID) as HTMLLinkElement | null;
  if (link) return link;

  link =
    document.querySelector<HTMLLinkElement>('link[rel="manifest"]') ??
    document.createElement('link');
  link.id = MANIFEST_LINK_ID;
  link.rel = 'manifest';
  if (!link.parentElement) {
    document.head.appendChild(link);
  }
  return link;
}

function ensureAppleTitle(): HTMLMetaElement {
  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-title"]',
  );
  if (meta) return meta;
  meta = document.createElement('meta');
  meta.name = 'apple-mobile-web-app-title';
  document.head.appendChild(meta);
  return meta;
}

export function aplicarManifestPwa(pathname: string): void {
  const painel = isPwaPainelPath(pathname);
  const link = ensureManifestLink();
  const href = painel ? MANIFEST_PAINEL : MANIFEST_CLIENTE;
  if (link.getAttribute('href') !== href) {
    link.setAttribute('href', href);
  }

  const appleTitle = ensureAppleTitle();
  appleTitle.content = painel ? 'FH Admin' : 'Food Hope';

  if (painel && document.title === 'Food Hope') {
    document.title = 'Food Hope Administração';
  }
}
