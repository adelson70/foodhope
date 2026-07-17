import { api, request } from './api';
import { withMutationToast } from './mutation-toast';
import type {
  ApiResponse,
  BuscarProdutosDados,
  CriarProdutoInput,
  EditarProdutoInput,
  ListarProdutosDados,
  Produto,
} from './types';

function toProdutoFormData(
  input: CriarProdutoInput | EditarProdutoInput,
): FormData {
  const formData = new FormData();

  if (input.nome !== undefined) {
    formData.append('nome', input.nome);
  }

  if (input.descricao !== undefined) {
    formData.append('descricao', input.descricao);
  }

  if (input.preco !== undefined) {
    formData.append('preco', String(input.preco));
  }

  if (input.adicionais !== undefined) {
    formData.append('adicionais', JSON.stringify(input.adicionais));
  }

  if (input.imagem) {
    formData.append('imagem', input.imagem);
  }

  return formData;
}

export const produtoService = {
  async listar(): Promise<ApiResponse<ListarProdutosDados>> {
    return request(api.get<ApiResponse<ListarProdutosDados>>('/produto'));
  },

  async buscar(params: string): Promise<ApiResponse<BuscarProdutosDados>> {
    return request(
      api.get<ApiResponse<BuscarProdutosDados>>(
        `/produto/${encodeURIComponent(params)}`,
      ),
    );
  },

  async criar(input: CriarProdutoInput): Promise<ApiResponse<Produto>> {
    return withMutationToast(
      () =>
        request(
          api.post<ApiResponse<Produto>>('/produto', toProdutoFormData(input)),
        ),
      {
        success: 'Produto criado com sucesso',
        error: 'Não foi possível criar o produto',
      },
    );
  },

  async editar(
    id: string,
    input: EditarProdutoInput,
  ): Promise<ApiResponse<Produto | { mensagem: string }>> {
    return withMutationToast(
      () =>
        request(
          api.put<ApiResponse<Produto | { mensagem: string }>>(
            `/produto/${id}`,
            toProdutoFormData(input),
          ),
        ),
      {
        success: 'Produto editado com sucesso',
        error: 'Não foi possível editar o produto',
      },
    );
  },

  async deletar(id: string): Promise<ApiResponse<{ mensagem: string }>> {
    return withMutationToast(
      () =>
        request(
          api.delete<ApiResponse<{ mensagem: string }>>(`/produto/${id}`),
        ),
      {
        success: 'Produto excluído com sucesso',
        error: 'Não foi possível excluir o produto',
      },
    );
  },
};
