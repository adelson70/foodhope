import { api, request } from './api';
import { clearToken, setToken } from './cookie';
import { withMutationToast } from './mutation-toast';
import { connectSocket, disconnectSocket } from './socket';
import type {
  ApiResponse,
  EditarOperadorInput,
  LoginDados,
  LoginPayload,
  LogoutDados,
  Operador,
} from './types';

export const authService = {
  async login(payload: LoginPayload): Promise<ApiResponse<LoginDados>> {
    return withMutationToast(async () => {
      const response = await request(
        api.post<ApiResponse<LoginDados>>('/auth/login', payload),
      );

      if (response.dados?.access_token) {
        setToken(response.dados.access_token);
        disconnectSocket();
        connectSocket();
      }

      return response;
    }, {
      success: 'Login realizado com sucesso',
      error: 'Não foi possível entrar',
    });
  },

  async logout(): Promise<ApiResponse<LogoutDados>> {
    return withMutationToast(async () => {
      try {
        return await request(
          api.post<ApiResponse<LogoutDados>>('/auth/logout'),
        );
      } finally {
        clearToken();
        disconnectSocket();
      }
    }, {
      success: 'Logout realizado com sucesso',
      error: 'Não foi possível sair',
    });
  },

  async me(): Promise<ApiResponse<Operador>> {
    return request(api.get<ApiResponse<Operador>>('/auth/me'));
  },

  async editar(input: EditarOperadorInput): Promise<ApiResponse<Operador>> {
    return withMutationToast(
      () =>
        request(api.put<ApiResponse<Operador>>('/auth/me', input)),
      {
        success: 'Operador editado com sucesso',
        error: 'Não foi possível editar o operador',
      },
    );
  },
};
