import { api, request } from './api';
import { withMutationToast } from './mutation-toast';
import type {
  ApiResponse,
  CriarOperadorInput,
  EditarOperadorAdminInput,
  ListarOperadoresDados,
  Operador,
} from './types';

export const operadorService = {
  async listar(): Promise<ApiResponse<ListarOperadoresDados>> {
    return request(
      api.get<ApiResponse<ListarOperadoresDados>>('/operador'),
    );
  },

  async criar(input: CriarOperadorInput): Promise<ApiResponse<Operador>> {
    return withMutationToast(
      () => request(api.post<ApiResponse<Operador>>('/operador', input)),
      {
        success: 'Usuário criado com sucesso',
        error: 'Não foi possível criar o usuário',
      },
    );
  },

  async editar(
    id: string,
    input: EditarOperadorAdminInput,
  ): Promise<ApiResponse<Operador | { mensagem: string }>> {
    return withMutationToast(
      () =>
        request(
          api.put<ApiResponse<Operador | { mensagem: string }>>(
            `/operador/${id}`,
            input,
          ),
        ),
      {
        success: 'Usuário editado com sucesso',
        error: 'Não foi possível editar o usuário',
      },
    );
  },

  async forcarLogout(id: string): Promise<ApiResponse<{ mensagem: string }>> {
    return withMutationToast(
      () =>
        request(
          api.post<ApiResponse<{ mensagem: string }>>(
            `/operador/${id}/logout`,
          ),
        ),
      {
        success: 'Logout solicitado',
        error: 'Não foi possível forçar o logout',
      },
    );
  },

  async deletar(id: string): Promise<ApiResponse<{ mensagem: string }>> {
    return withMutationToast(
      () =>
        request(
          api.delete<ApiResponse<{ mensagem: string }>>(`/operador/${id}`),
        ),
      {
        success: 'Usuário excluído com sucesso',
        error: 'Não foi possível excluir o usuário',
      },
    );
  },
};
