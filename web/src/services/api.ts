import axios, { type AxiosError, type AxiosResponse } from 'axios';

import { clearToken, getToken } from './cookie';
import type { ApiErrorBody, ApiResponse } from './types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type');
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) {
      clearToken();

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
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
