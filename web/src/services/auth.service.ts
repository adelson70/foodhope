import { api, request } from './api';
import { clearToken, setToken } from './cookie';
import type {
  ApiResponse,
  LoginDados,
  LoginPayload,
  LogoutDados,
  Operador,
} from './types';

export const authService = {
  async login(payload: LoginPayload): Promise<ApiResponse<LoginDados>> {
    const response = await request(
      api.post<ApiResponse<LoginDados>>('/auth/login', payload),
    );

    if (response.dados?.access_token) {
      setToken(response.dados.access_token);
    }

    return response;
  },

  async logout(): Promise<ApiResponse<LogoutDados>> {
    try {
      return await request(api.post<ApiResponse<LogoutDados>>('/auth/logout'));
    } finally {
      clearToken();
    }
  },

  async me(): Promise<ApiResponse<Operador>> {
    return request(api.get<ApiResponse<Operador>>('/auth/me'));
  },
};
