import { api, request } from './api';
import { withMutationToast } from './mutation-toast';
import type {
  ApiResponse,
  Categoria,
  CriarCategoriaInput,
  EditarCategoriaInput,
  ListarCategoriasDados,
} from './types';

export const categoriaService = {
  async listar(): Promise<ApiResponse<ListarCategoriasDados>> {
    return request(
      api.get<ApiResponse<ListarCategoriasDados>>('/categoria'),
    );
  },

  async criar(
    input: CriarCategoriaInput,
  ): Promise<ApiResponse<Categoria>> {
    return withMutationToast(
      () =>
        request(api.post<ApiResponse<Categoria>>('/categoria', input)),
      {
        success: 'Categoria criada com sucesso',
        error: 'Não foi possível criar a categoria',
      },
    );
  },

  async editar(
    id: string,
    input: EditarCategoriaInput,
  ): Promise<ApiResponse<Categoria | { mensagem: string }>> {
    return withMutationToast(
      () =>
        request(
          api.put<ApiResponse<Categoria | { mensagem: string }>>(
            `/categoria/${id}`,
            input,
          ),
        ),
      {
        success: 'Categoria editada com sucesso',
        error: 'Não foi possível editar a categoria',
      },
    );
  },

  async deletar(id: string): Promise<ApiResponse<{ mensagem: string }>> {
    return withMutationToast(
      () =>
        request(
          api.delete<ApiResponse<{ mensagem: string }>>(`/categoria/${id}`),
        ),
      {
        success: 'Categoria excluída com sucesso',
        error: 'Não foi possível excluir a categoria',
      },
    );
  },
};
