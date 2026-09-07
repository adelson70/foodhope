type Listener = () => void;

export const RECONECTOU_EVENT = 'foodhope:reconectou';

let browserOnline =
  typeof navigator === 'undefined' ? true : navigator.onLine;
let apiUnreachable = false;
let initialized = false;

const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function emitReconectou() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(RECONECTOU_EVENT));
}

export function isAppOffline(): boolean {
  return !browserOnline || apiUnreachable;
}

export function getConectividade() {
  return {
    browserOnline,
    apiUnreachable,
    offline: isAppOffline(),
  };
}

export function marcarApiInalcancavel() {
  if (apiUnreachable) return;
  apiUnreachable = true;
  emit();
}

export function marcarApiAlcancavel() {
  if (!apiUnreachable) return;
  apiUnreachable = false;
  emit();
}

export function liberarRetryApi(): boolean {
  if (!browserOnline || !apiUnreachable) return false;
  apiUnreachable = false;
  emit();
  emitReconectou();
  return true;
}

export function subscribeConectividade(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function initConectividade() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  browserOnline = navigator.onLine;

  window.addEventListener('online', () => {
    const estavaOffline = isAppOffline();
    browserOnline = true;
    apiUnreachable = false;
    emit();
    if (estavaOffline) emitReconectou();
  });

  window.addEventListener('offline', () => {
    browserOnline = false;
    emit();
  });

  window.addEventListener('focus', () => {
    liberarRetryApi();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      liberarRetryApi();
    }
  });
}
