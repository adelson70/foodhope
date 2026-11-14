type Listener = () => void;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISPENSADO_KEY = 'foodhope-instalar-dispensado-em';
const DISPENSA_MS = 1000 * 60 * 60 * 24 * 7;

let promptEvent: BeforeInstallPromptEvent | null = null;
let instalado = false;
let initialized = false;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    nav.standalone === true
  );
}

/** iPhone/iPad, incluindo iPadOS que se apresenta como Mac com toque. */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
}

export type NavegadorInstalacao =
  | 'ios'
  | 'inapp'
  | 'android-chrome'
  | 'android-samsung'
  | 'android-firefox'
  | 'android-outro'
  | 'desktop-chromium'
  | 'desktop-safari';

/**
 * Navegador atual para escolher as instruções de instalação manual.
 * `null` quando não há como instalar (ex.: Firefox no computador).
 */
export function detectarNavegadorInstalacao(): NavegadorInstalacao | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|Snapchat|Twitter/i.test(ua)) {
    return 'inapp';
  }
  if (isIos()) return 'ios';
  if (/Android/i.test(ua)) {
    if (/SamsungBrowser/i.test(ua)) return 'android-samsung';
    if (/Firefox/i.test(ua)) return 'android-firefox';
    if (/Chrome|EdgA/i.test(ua)) return 'android-chrome';
    return 'android-outro';
  }
  if (/Edg\/|Chrome\//i.test(ua) && !/OPR\//i.test(ua)) return 'desktop-chromium';
  if (/Macintosh/i.test(ua) && /Safari/i.test(ua) && !/Chrome|Firefox/i.test(ua)) {
    return 'desktop-safari';
  }
  return null;
}

export function podeInstalarNativo(): boolean {
  return promptEvent !== null;
}

export function foiInstalado(): boolean {
  return instalado || isStandalone();
}

export function foiDispensadoRecentemente(): boolean {
  try {
    const valor = localStorage.getItem(DISPENSADO_KEY);
    if (!valor) return false;
    const em = Number(valor);
    return Number.isFinite(em) && Date.now() - em < DISPENSA_MS;
  } catch {
    return false;
  }
}

export function dispensarInstalacao(): void {
  try {
    localStorage.setItem(DISPENSADO_KEY, String(Date.now()));
  } catch {
    return;
  }
}

/** Abre o prompt nativo (Chrome/Edge). Retorna true se o usuário aceitou. */
export async function solicitarInstalacao(): Promise<boolean> {
  const evento = promptEvent;
  if (!evento) return false;
  promptEvent = null;
  emit();
  await evento.prompt();
  const { outcome } = await evento.userChoice;
  return outcome === 'accepted';
}

export function subscribeInstalacao(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Chamar antes do render: o beforeinstallprompt pode disparar cedo. */
export function initInstalacaoPwa(): void {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    promptEvent = event as BeforeInstallPromptEvent;
    emit();
  });

  window.addEventListener('appinstalled', () => {
    instalado = true;
    promptEvent = null;
    emit();
  });
}
