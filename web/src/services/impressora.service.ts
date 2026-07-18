import { api, request } from './api';
import { withMutationToast } from './mutation-toast';
import type {
  ApiResponse,
  ConfigImpressora,
  ConfigurarImpressoraInput,
  PortaImpressora,
  TestarImpressoraDados,
} from './types';

export const impressoraService = {
  async obter(): Promise<ApiResponse<ConfigImpressora>> {
    return request(api.get<ApiResponse<ConfigImpressora>>('/impressora'));
  },

  async listarPortas(): Promise<ApiResponse<{ portas: PortaImpressora[] }>> {
    return request(
      api.get<ApiResponse<{ portas: PortaImpressora[] }>>('/impressora/portas'),
    );
  },

  async testar(
    input: ConfigurarImpressoraInput,
  ): Promise<ApiResponse<TestarImpressoraDados>> {
    return withMutationToast(
      () =>
        request(
          api.post<ApiResponse<TestarImpressoraDados>>(
            '/impressora/testar',
            input,
          ),
        ),
      {
        success: 'Conexão com a impressora OK',
        error: 'Não foi possível conectar à impressora',
      },
    );
  },

  async salvar(
    input: ConfigurarImpressoraInput,
  ): Promise<ApiResponse<ConfigImpressora>> {
    return withMutationToast(
      () =>
        request(
          api.put<ApiResponse<ConfigImpressora>>('/impressora', input),
        ),
      {
        success: 'Impressora configurada com sucesso',
        error: 'Não foi possível salvar a impressora',
      },
    );
  },
};
