import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { clearToken, getToken } from './cookie';
import type { ApiErrorBody, ApiResponse } from './types';
import {
  clearVisitorSession,
  pathWithQueryFromUrl,
  signRequestHeaders,
} from './visitor';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  withCredentials: true,
});

function isVisitorBootstrapUrl(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('/visitor/register') ||
    url.includes('/visitor/confirm') ||
    url.includes('/auth/login')
  );
}

function bodyForSignature(
  data: InternalAxiosRequestConfig['data'],
): ArrayBuffer | string | undefined {
  if (data == null || data instanceof FormData) {
    return undefined;
  }
  if (typeof data === 'string') {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return data;
  }
  return JSON.stringify(data);
}

api.interceptors.request.use(async (config) => {
  const token = getToken();

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type');
  }

  if (!token && !isVisitorBootstrapUrl(config.url)) {
    const baseURL = config.baseURL || import.meta.env.VITE_API_URL || '';
    const fullUri = axios.getUri(config);
    const pathWithQuery = pathWithQueryFromUrl(fullUri, baseURL);
    const headers = await signRequestHeaders({
      apiBaseUrl: baseURL.replace(/\/$/, ''),
      method: (config.method || 'get').toUpperCase(),
      pathWithQuery,
      bodyBytes: bodyForSignature(config.data),
    });

    Object.entries(headers).forEach(([key, value]) => {
      config.headers.set(key, value);
    });
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) {
      const hadToken = Boolean(getToken());

      if (hadToken) {
        clearToken();
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      } else {
        void clearVisitorSession();
      }
    }

    return Promise.reject(error);
  },
);

export async function request<T>(
  promise: Promise<AxiosResponse<ApiResponse<T>>>,
): Promise<ApiResponse<T>> {
  const { data } = await promise;
  return data;
}

export function getApiErrorMensagens(error: unknown): string[] {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const mensagens = error.response?.data?.mensagens;
    if (Array.isArray(mensagens) && mensagens.length > 0) {
      return mensagens;
    }
  }

  if (error instanceof Error && error.message) {
    return [error.message];
  }

  return ['Erro inesperado. Tente novamente.'];
}
