import { api, request } from './api';
import { withMutationToast } from './mutation-toast';
import type {
  ApiResponse,
  CheckoutDados,
  ConfigInfinitePay,
  ConfigurarInfinitePayInput,
  ConfirmarCheckoutInput,
  CriarPedidoDados,
  CriarPedidoInput,
} from './types';

export const infinitepayService = {
  async obter(): Promise<ApiResponse<ConfigInfinitePay>> {
    return request(api.get<ApiResponse<ConfigInfinitePay>>('/infinitepay'));
  },

  async salvar(
    input: ConfigurarInfinitePayInput,
  ): Promise<ApiResponse<ConfigInfinitePay>> {
    return withMutationToast(
      () =>
        request(
          api.put<ApiResponse<ConfigInfinitePay>>('/infinitepay', input),
        ),
      {
        success: 'InfinitePay configurada com sucesso',
        error: 'Não foi possível salvar a InfinitePay',
      },
    );
  },

  async checkout(
    input: CriarPedidoInput,
  ): Promise<ApiResponse<CheckoutDados>> {
    return withMutationToast(
      () =>
        request(api.post<ApiResponse<CheckoutDados>>('/checkout', input)),
      {
        success: false,
        error: 'Não foi possível iniciar o pagamento',
      },
    );
  },

  async confirmar(
    input: ConfirmarCheckoutInput,
  ): Promise<ApiResponse<CriarPedidoDados>> {
    return withMutationToast(
      () =>
        request(
          api.post<ApiResponse<CriarPedidoDados>>(
            '/checkout/confirmar',
            input,
          ),
        ),
      {
        success: false,
        error: 'Não foi possível confirmar o pagamento',
      },
    );
  },
};
