import { idbDelete, idbGet, idbPut, STORE_VISITOR } from '../lib/clientIdb';

const SESSION_KEY = 'session';
const LEGACY_LOCAL_STORAGE_KEY = 'foodhope_visitor';

export type VisitorSession = {
  visitorId: string;
  publicKey: string;
  privateKey: CryptoKey;
  verified: boolean;
};

type StoredVisitorSession = {
  visitorId: string;
  publicKey: string;
  verified: boolean;
  privateKey?: CryptoKey;
  privateKeyJwk?: JsonWebKey;
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

function clearLegacyLocalStorage() {
  try {
    localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
  } catch {
    return;
  }
}

async function importPrivateKeyFromJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

async function resolvePrivateKey(
  stored: StoredVisitorSession,
): Promise<CryptoKey | null> {
  if (stored.privateKey && typeof stored.privateKey === 'object') {
    try {
      await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        stored.privateKey,
        new TextEncoder().encode('foodhope-probe'),
      );
      return stored.privateKey;
    } catch {
      // fallback JWK
    }
  }

  if (stored.privateKeyJwk) {
    try {
      return await importPrivateKeyFromJwk(stored.privateKeyJwk);
    } catch {
      return null;
    }
  }

  return null;
}

async function loadSession(): Promise<VisitorSession | null> {
  clearLegacyLocalStorage();

  try {
    const parsed = await idbGet<StoredVisitorSession>(STORE_VISITOR, SESSION_KEY);
    if (!parsed?.visitorId || !parsed?.publicKey || !parsed.verified) {
      return null;
    }

    const privateKey = await resolvePrivateKey(parsed);
    if (!privateKey) return null;

    return {
      visitorId: parsed.visitorId,
      publicKey: parsed.publicKey,
      privateKey,
      verified: true,
    };
  } catch {
    return null;
  }
}

async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persisted && navigator.storage.persist) {
      const already = await navigator.storage.persisted();
      if (!already) {
        await navigator.storage.persist();
      }
    }
  } catch {
    return;
  }
}

async function saveSessionWithCryptoKey(
  session: VisitorSession,
): Promise<void> {
  await idbPut(STORE_VISITOR, SESSION_KEY, {
    visitorId: session.visitorId,
    publicKey: session.publicKey,
    privateKey: session.privateKey,
    verified: true,
  } satisfies StoredVisitorSession);
}

async function saveSessionWithJwk(
  session: VisitorSession,
  jwk: JsonWebKey,
): Promise<void> {
  await idbPut(STORE_VISITOR, SESSION_KEY, {
    visitorId: session.visitorId,
    publicKey: session.publicKey,
    privateKeyJwk: jwk,
    verified: true,
  } satisfies StoredVisitorSession);
}

async function verifyRoundTrip(session: VisitorSession): Promise<boolean> {
  const loaded = await loadSession();
  if (!loaded || loaded.visitorId !== session.visitorId) return false;
  try {
    await signMessage(loaded.privateKey, 'foodhope-roundtrip');
    return true;
  } catch {
    return false;
  }
}

async function saveSession(
  session: VisitorSession,
  extractableJwk: JsonWebKey,
): Promise<void> {
  clearLegacyLocalStorage();

  try {
    await saveSessionWithCryptoKey(session);
    if (await verifyRoundTrip(session)) {
      return;
    }
  } catch {
    // fallback JWK
  }

  await saveSessionWithJwk(session, extractableJwk);
  if (!(await verifyRoundTrip(session))) {
    throw new Error('Falha ao persistir sessão visitor');
  }
}

export async function clearVisitorSession(): Promise<void> {
  clearLegacyLocalStorage();
  try {
    await idbDelete(STORE_VISITOR, SESSION_KEY);
  } catch {
    return;
  }
}

export async function getVisitorId(): Promise<string | null> {
  const session = await loadSession();
  return session?.visitorId ?? null;
}

async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: CryptoKey;
  privateKeyJwk: JsonWebKey;
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
    privateKeyJwk: privateJwk,
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
  await saveSession(session, keys.privateKeyJwk);
  await requestPersistentStorage();
  return session;
}

export async function ensureVisitor(
  apiBaseUrl: string,
): Promise<VisitorSession> {
  const existing = await loadSession();
  if (existing) {
    void requestPersistentStorage();
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

export async function signSocketAuth(apiBaseUrl: string): Promise<{
  visitorId: string;
  timestamp: string;
  signature: string;
}> {
  const session = await ensureVisitor(apiBaseUrl);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const bodyHash = await hashBodyBytes('');
  const canonical = buildRequestCanonical(
    'GET',
    '/socket.io/',
    timestamp,
    bodyHash,
  );
  const signature = await signMessage(session.privateKey, canonical);

  return {
    visitorId: session.visitorId,
    timestamp,
    signature,
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
