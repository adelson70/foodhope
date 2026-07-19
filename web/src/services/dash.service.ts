import { api, request } from './api';
import { withMutationToast } from './mutation-toast';
import type { ApiResponse, DashDados, TipoRelatorio } from './types';

export const dashService = {
  async obter(): Promise<ApiResponse<DashDados>> {
    return request(api.get<ApiResponse<DashDados>>('/dash'));
  },

  async gerarRelatorio(
    tipo: TipoRelatorio = 'resumido',
    data?: string,
  ): Promise<ApiResponse<Record<string, never>>> {
    return withMutationToast(
      () =>
        request(
          api.post<ApiResponse<Record<string, never>>>('/dash/relatorio', {
            tipo,
            ...(data ? { data } : {}),
          }),
        ),
      {
        success: 'Relatório enviado para a impressora',
        error: 'Não foi possível gerar o relatório',
      },
    );
  },
};
