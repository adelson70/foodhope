import { api, request } from './api';
import { withMutationToast } from './mutation-toast';
import type {
  ApiResponse,
  BuscarPedidosDados,
  CriarPedidoDados,
  CriarPedidoInput,
  ListarPedidosDados,
} from './types';

export type ListarPedidosParams = {
  cursor?: string;
  limit?: number;
};

export type CriarPedidoOptions = {
  silentSuccess?: boolean;
};

export const pedidoService = {
  async listar(
    params: ListarPedidosParams = {},
  ): Promise<ApiResponse<ListarPedidosDados>> {
    return request(
      api.get<ApiResponse<ListarPedidosDados>>('/pedido', { params }),
    );
  },

  async buscar(params: string): Promise<ApiResponse<BuscarPedidosDados>> {
    return request(
      api.get<ApiResponse<BuscarPedidosDados>>(
        `/pedido/${encodeURIComponent(params)}`,
      ),
    );
  },

  async criar(
    input: CriarPedidoInput,
    options: CriarPedidoOptions = {},
  ): Promise<ApiResponse<CriarPedidoDados>> {
    return withMutationToast(
      () =>
        request(api.post<ApiResponse<CriarPedidoDados>>('/pedido', input)),
      {
        success: options.silentSuccess
          ? false
          : 'Pedido criado com sucesso',
        error: 'Não foi possível criar o pedido',
      },
    );
  },

  async deletar(id: string): Promise<ApiResponse<Record<string, never>>> {
    return withMutationToast(
      () =>
        request(
          api.delete<ApiResponse<Record<string, never>>>(`/pedido/${id}`),
        ),
      {
        success: 'Pedido excluído com sucesso',
        error: 'Não foi possível excluir o pedido',
      },
    );
  },
};
