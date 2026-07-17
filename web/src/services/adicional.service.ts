import { api, request } from './api';
import { withMutationToast } from './mutation-toast';
import type {
  AdicionalGlobal,
  ApiResponse,
  CriarAdicionalGlobalInput,
  EditarAdicionalGlobalInput,
  ListarAdicionaisGlobaisDados,
} from './types';

export const adicionalService = {
  async listar(): Promise<ApiResponse<ListarAdicionaisGlobaisDados>> {
    return request(
      api.get<ApiResponse<ListarAdicionaisGlobaisDados>>('/adicional'),
    );
  },

  async criar(
    input: CriarAdicionalGlobalInput,
  ): Promise<ApiResponse<AdicionalGlobal>> {
    return withMutationToast(
      () =>
        request(api.post<ApiResponse<AdicionalGlobal>>('/adicional', input)),
      {
        success: 'Adicional criado com sucesso',
        error: 'Não foi possível criar o adicional',
      },
    );
  },

  async editar(
    id: string,
    input: EditarAdicionalGlobalInput,
  ): Promise<ApiResponse<AdicionalGlobal | { mensagem: string }>> {
    return withMutationToast(
      () =>
        request(
          api.put<ApiResponse<AdicionalGlobal | { mensagem: string }>>(
            `/adicional/${id}`,
            input,
          ),
        ),
      {
        success: 'Adicional editado com sucesso',
        error: 'Não foi possível editar o adicional',
      },
    );
  },

  async deletar(id: string): Promise<ApiResponse<{ mensagem: string }>> {
    return withMutationToast(
      () =>
        request(
          api.delete<ApiResponse<{ mensagem: string }>>(`/adicional/${id}`),
        ),
      {
        success: 'Adicional excluído com sucesso',
        error: 'Não foi possível excluir o adicional',
      },
    );
  },
};
