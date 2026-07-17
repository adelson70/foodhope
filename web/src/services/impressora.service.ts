import { api, request } from './api';
import { withMutationToast } from './mutation-toast';
import type {
  ApiResponse,
  ConfigImpressora,
  TestarImpressoraDados,
} from './types';

export const impressoraService = {
  async obter(): Promise<ApiResponse<ConfigImpressora>> {
    return request(api.get<ApiResponse<ConfigImpressora>>('/impressora'));
  },

  async testar(ip: string): Promise<ApiResponse<TestarImpressoraDados>> {
    return withMutationToast(
      () =>
        request(
          api.post<ApiResponse<TestarImpressoraDados>>('/impressora/testar', {
            ip,
          }),
        ),
      {
        success: 'Conexão com a impressora OK',
        error: 'Não foi possível conectar à impressora',
      },
    );
  },

  async salvar(ip: string): Promise<ApiResponse<ConfigImpressora>> {
    return withMutationToast(
      () =>
        request(
          api.put<ApiResponse<ConfigImpressora>>('/impressora', { ip }),
        ),
      {
        success: 'Impressora configurada com sucesso',
        error: 'Não foi possível salvar a impressora',
      },
    );
  },
};
