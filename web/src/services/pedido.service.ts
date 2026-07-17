import { api, request } from './api';
import type {
  ApiResponse,
  BuscarPedidosDados,
  CriarPedidoDados,
  CriarPedidoInput,
  ListarPedidosDados,
} from './types';

export const pedidoService = {
  async listar(): Promise<ApiResponse<ListarPedidosDados>> {
    return request(api.get<ApiResponse<ListarPedidosDados>>('/pedido'));
  },

  async buscar(params: string): Promise<ApiResponse<BuscarPedidosDados>> {
    return request(
      api.get<ApiResponse<BuscarPedidosDados>>(
        `/pedido/${encodeURIComponent(params)}`,
      ),
    );
  },

  async criar(input: CriarPedidoInput): Promise<ApiResponse<CriarPedidoDados>> {
    return request(
      api.post<ApiResponse<CriarPedidoDados>>('/pedido', input),
    );
  },

  async deletar(id: string): Promise<ApiResponse<Record<string, never>>> {
    return request(
      api.delete<ApiResponse<Record<string, never>>>(`/pedido/${id}`),
    );
  },
};
