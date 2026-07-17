const DB_NAME = 'foodhope';
const DB_VERSION = 1;
const STORE_NAME = 'visitor';
const SESSION_KEY = 'session';
const LEGACY_LOCAL_STORAGE_KEY = 'foodhope_visitor';

type VisitorSession = {
  visitorId: string;
  publicKey: string;
  privateKey: CryptoKey;
  verified: boolean;
};

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function sha256Hex(data: ArrayBuffer | string): Promise<string> {
  const bytes =
    typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function openVisitorDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error('Falha ao abrir IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function idbGet(key: string): Promise<VisitorSession | undefined> {
  const db = await openVisitorDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result as VisitorSession | undefined);
      };
      request.onerror = () => {
        reject(request.error ?? new Error('Falha ao ler IndexedDB'));
      };
    });
  } finally {
    db.close();
  }
}

async function idbPut(key: string, value: VisitorSession): Promise<void> {
  const db = await openVisitorDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(request.error ?? new Error('Falha ao gravar IndexedDB'));
      };
    });
  } finally {
    db.close();
  }
}

async function idbDelete(key: string): Promise<void> {
  const db = await openVisitorDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(request.error ?? new Error('Falha ao limpar IndexedDB'));
      };
    });
  } finally {
    db.close();
  }
}

function clearLegacyLocalStorage() {
  try {
    localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
  } catch {
    return;
  }
}

async function loadSession(): Promise<VisitorSession | null> {
  clearLegacyLocalStorage();

  try {
    const parsed = await idbGet(SESSION_KEY);
    if (
      !parsed?.visitorId ||
      !parsed?.publicKey ||
      !parsed?.privateKey ||
      !parsed.verified
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function saveSession(session: VisitorSession): Promise<void> {
  clearLegacyLocalStorage();
  await idbPut(SESSION_KEY, session);
}

export async function clearVisitorSession(): Promise<void> {
  clearLegacyLocalStorage();
  try {
    await idbDelete(SESSION_KEY);
  } catch {
    return;
  }
}

async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: CryptoKey;
}> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );

  const spki = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  return {
    publicKey: bufferToBase64(spki),
    privateKey,
  };
}

async function signMessage(
  privateKey: CryptoKey,
  message: string,
): Promise<string> {
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(message),
  );
  return bufferToBase64(signature);
}

export function buildRequestCanonical(
  method: string,
  pathWithQuery: string,
  timestamp: string,
  bodyHashHex: string,
): string {
  return `${method.toUpperCase()}\n${pathWithQuery}\n${timestamp}\n${bodyHashHex}`;
}

export async function hashBodyBytes(
  body: ArrayBuffer | string | undefined,
): Promise<string> {
  if (body === undefined || body === '') {
    return sha256Hex('');
  }
  return sha256Hex(body);
}

type RegisterResponse = {
  sucesso: boolean;
  dados?: { visitorId: string; challenge: string };
};

type ConfirmResponse = {
  sucesso: boolean;
  dados?: { visitorId: string; verified: boolean };
};

let ensurePromise: Promise<VisitorSession> | null = null;

async function registerAndConfirm(
  apiBaseUrl: string,
): Promise<VisitorSession> {
  const keys = await generateKeyPair();

  const registerRes = await fetch(`${apiBaseUrl}/visitor/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ publicKey: keys.publicKey }),
  });

  const registerJson = (await registerRes.json()) as RegisterResponse;
  if (!registerRes.ok || !registerJson.sucesso || !registerJson.dados) {
    throw new Error('Falha ao registrar visitor');
  }

  const { visitorId, challenge } = registerJson.dados;
  const signature = await signMessage(keys.privateKey, challenge);

  const confirmRes = await fetch(`${apiBaseUrl}/visitor/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ visitorId, signature }),
  });

  const confirmJson = (await confirmRes.json()) as ConfirmResponse;
  if (!confirmRes.ok || !confirmJson.sucesso || !confirmJson.dados?.verified) {
    throw new Error('Falha ao confirmar visitor');
  }

  const session: VisitorSession = {
    visitorId,
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
    verified: true,
  };
  await saveSession(session);
  return session;
}

export async function ensureVisitor(
  apiBaseUrl: string,
): Promise<VisitorSession> {
  const existing = await loadSession();
  if (existing) {
    return existing;
  }

  if (!ensurePromise) {
    ensurePromise = registerAndConfirm(apiBaseUrl).finally(() => {
      ensurePromise = null;
    });
  }

  return ensurePromise;
}

export async function signRequestHeaders(params: {
  apiBaseUrl: string;
  method: string;
  pathWithQuery: string;
  bodyBytes?: ArrayBuffer | string;
}): Promise<Record<string, string>> {
  const session = await ensureVisitor(params.apiBaseUrl);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const bodyHash = await hashBodyBytes(params.bodyBytes);
  const canonical = buildRequestCanonical(
    params.method,
    params.pathWithQuery,
    timestamp,
    bodyHash,
  );
  const signature = await signMessage(session.privateKey, canonical);

  return {
    'X-Visitor-ID': session.visitorId,
    'X-Timestamp': timestamp,
    'X-Signature': signature,
  };
}

export function pathWithQueryFromUrl(
  url: string,
  baseURL?: string,
): string {
  try {
    const absolute = url.startsWith('http')
      ? new URL(url)
      : new URL(url, baseURL || window.location.origin);
    return `${absolute.pathname}${absolute.search}`;
  } catch {
    return url.startsWith('/') ? url : `/${url}`;
  }
}

export { base64ToBuffer };
