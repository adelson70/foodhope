import axios from 'axios';

import { isAppOffline } from './conectividade';

const GATEWAY_STATUSES = new Set([502, 503, 504]);

export function isNetworkFailure(error: unknown): boolean {
  if (!navigator.onLine) return true;

  if (!axios.isAxiosError(error)) return false;

  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
    return true;
  }

  const status = error.response?.status;
  if (status != null && GATEWAY_STATUSES.has(status)) {
    return true;
  }

  return !error.response;
}

export function isOfflineNow(): boolean {
  return isAppOffline();
}

export { isAppOffline } from './conectividade';
