const DB_NAME = 'foodhope';
const DB_VERSION = 3;

export const STORE_VISITOR = 'visitor';
export const STORE_CARRINHO = 'carrinho';
export const STORE_PEDIDOS = 'pedidosLocais';
export const STORE_CLIENTE = 'clientePerfil';

export class QuotaExceededIdbError extends Error {
  constructor(message = 'Armazenamento local sem espaço') {
    super(message);
    this.name = 'QuotaExceededIdbError';
  }
}

function isQuotaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String(error.name) : '';
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

export function openClientDb(): Promise<IDBDatabase> {
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
      for (const name of [
        STORE_VISITOR,
        STORE_CARRINHO,
        STORE_PEDIDOS,
        STORE_CLIENTE,
      ]) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      }
    };
  });
}

export async function idbGet<T>(
  storeName: string,
  key: string,
): Promise<T | undefined> {
  const db = await openClientDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result as T | undefined);
      };
      request.onerror = () => {
        reject(request.error ?? new Error('Falha ao ler IndexedDB'));
      };
    });
  } finally {
    db.close();
  }
}

export async function idbPut(
  storeName: string,
  key: string,
  value: unknown,
): Promise<void> {
  const db = await openClientDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        const err = request.error ?? new Error('Falha ao gravar IndexedDB');
        if (isQuotaError(err)) {
          reject(new QuotaExceededIdbError());
          return;
        }
        reject(err);
      };
    });
  } finally {
    db.close();
  }
}

export async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openClientDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
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
