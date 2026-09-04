import { api, request } from './api';
import { withMutationToast } from './mutation-toast';
import type {
  ApiResponse,
  ConfigTelaPedidos,
  ListarTelaPedidosPublicoDados,
} from './types';

export const telaPedidosService = {
  async obter(): Promise<ApiResponse<ConfigTelaPedidos>> {
    return request(api.get<ApiResponse<ConfigTelaPedidos>>('/tela-pedidos'));
  },

  async listarPublico(
    hash: string,
  ): Promise<ApiResponse<ListarTelaPedidosPublicoDados>> {
    return request(
      api.get<ApiResponse<ListarTelaPedidosPublicoDados>>(
        `/tela-pedidos/${encodeURIComponent(hash)}`,
      ),
    );
  },

  async regenerar(): Promise<ApiResponse<ConfigTelaPedidos>> {
    return withMutationToast(
      () =>
        request(
          api.post<ApiResponse<ConfigTelaPedidos>>('/tela-pedidos/regenerar'),
        ),
      {
        success: 'Link da tela regenerado',
        error: 'Não foi possível regenerar o link',
      },
    );
  },
};
