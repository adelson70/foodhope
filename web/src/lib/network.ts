import axios from 'axios';

export function isNetworkFailure(error: unknown): boolean {
  if (!navigator.onLine) return true;

  if (!axios.isAxiosError(error)) return false;

  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
    return true;
  }

  return !error.response;
}

export function isOfflineNow(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}
