import { avisarRefreshTelaPedidos } from '../lib/telaPedidosSync';
import { api, request } from './api';
import { withMutationToast } from './mutation-toast';
import type {
  ApiResponse,
  ConfigTelaPedidos,
  ListarTelaPedidosPublicoDados,
  VisualizacaoTelaPedidos,
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

  async atualizarVisualizacao(
    visualizacao: VisualizacaoTelaPedidos,
  ): Promise<ApiResponse<ConfigTelaPedidos>> {
    return withMutationToast(
      async () => {
        const response = await request(
          api.put<ApiResponse<ConfigTelaPedidos>>('/tela-pedidos', {
            visualizacao,
          }),
        );
        if (response.sucesso) avisarRefreshTelaPedidos();
        return response;
      },
      {
        success: 'Visualização atualizada',
        error: 'Não foi possível atualizar a visualização',
      },
    );
  },

  async forcarRefresh(): Promise<ApiResponse<{ ok: boolean }>> {
    return withMutationToast(
      async () => {
        const response = await request(
          api.post<ApiResponse<{ ok: boolean }>>('/tela-pedidos/refresh'),
        );
        if (response.sucesso) avisarRefreshTelaPedidos();
        return response;
      },
      {
        success: 'Tela de pedidos atualizada',
        error: 'Não foi possível atualizar a tela',
      },
    );
  },

  async regenerar(): Promise<ApiResponse<ConfigTelaPedidos>> {
    return withMutationToast(
      async () => {
        const response = await request(
          api.post<ApiResponse<ConfigTelaPedidos>>('/tela-pedidos/regenerar'),
        );
        if (response.sucesso) avisarRefreshTelaPedidos();
        return response;
      },
      {
        success: 'Link da tela regenerado',
        error: 'Não foi possível regenerar o link',
      },
    );
  },
};
