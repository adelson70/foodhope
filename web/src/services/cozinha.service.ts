import { api, request } from './api';
import { withMutationToast } from './mutation-toast';
import type { AberturaCaixa, ApiResponse, ConfigCozinha } from './types';

export const cozinhaService = {
  async obter(): Promise<ApiResponse<ConfigCozinha>> {
    return request(api.get<ApiResponse<ConfigCozinha>>('/cozinha'));
  },

  /** Ao abrir, `abertura` registra o dinheiro no caixa (fundo de troco). */
  async atualizar(
    ativa: boolean,
    abertura?: { fundo_troco: number; observacao?: string },
  ): Promise<ApiResponse<ConfigCozinha>> {
    return withMutationToast(
      () =>
        request(
          api.put<ApiResponse<ConfigCozinha>>('/cozinha', {
            ativa,
            ...abertura,
          }),
        ),
      {
        success: ativa ? 'Cozinha ativada' : 'Cozinha desativada',
        error: 'Não foi possível atualizar a cozinha',
      },
    );
  },

  async ultimaAbertura(): Promise<
    ApiResponse<{ abertura: AberturaCaixa | null }>
  > {
    return request(
      api.get<ApiResponse<{ abertura: AberturaCaixa | null }>>(
        '/cozinha/abertura',
      ),
    );
  },
};
