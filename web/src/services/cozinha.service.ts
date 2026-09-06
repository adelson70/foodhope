import { api, request } from './api';
import { withMutationToast } from './mutation-toast';
import type { ApiResponse, ConfigCozinha } from './types';

export const cozinhaService = {
  async obter(): Promise<ApiResponse<ConfigCozinha>> {
    return request(api.get<ApiResponse<ConfigCozinha>>('/cozinha'));
  },

  async atualizar(ativa: boolean): Promise<ApiResponse<ConfigCozinha>> {
    return withMutationToast(
      () =>
        request(
          api.put<ApiResponse<ConfigCozinha>>('/cozinha', { ativa }),
        ),
      {
        success: ativa ? 'Cozinha ativada' : 'Cozinha desativada',
        error: 'Não foi possível atualizar a cozinha',
      },
    );
  },
};
