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

export type ListarProdutosParams = {
  cursor?: string;
  limit?: number;
};

function toProdutoJson(input: CriarProdutoInput | EditarProdutoInput) {
  const { imagem: _imagem, ...dados } = input;
  return dados;
}

function toImagemFormData(imagem: File): FormData {
  const formData = new FormData();
  formData.append('imagem', imagem);
  return formData;
}

async function enviarImagem(
  id: string,
  imagem: File,
): Promise<ApiResponse<Produto>> {
  return request(
    api.put<ApiResponse<Produto>>(
      `/produto/${id}/imagem`,
      toImagemFormData(imagem),
    ),
  );
}

export const produtoService = {
  async listar(
    params: ListarProdutosParams = {},
  ): Promise<ApiResponse<ListarProdutosDados>> {
    return request(
      api.get<ApiResponse<ListarProdutosDados>>('/produto', { params }),
    );
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
      async () => {
        const response = await request(
          api.post<ApiResponse<Produto>>('/produto', toProdutoJson(input)),
        );

        if (!response.sucesso || !response.dados?.id || !input.imagem) {
          return response;
        }

        const imagemResponse = await enviarImagem(response.dados.id, input.imagem);
        if (!imagemResponse.sucesso) {
          return imagemResponse;
        }

        return { ...imagemResponse, mensagens: response.mensagens };
      },
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
      async () => {
        const response = await request(
          api.put<ApiResponse<Produto | { mensagem: string }>>(
            `/produto/${id}`,
            toProdutoJson(input),
          ),
        );

        if (!response.sucesso || !input.imagem) {
          return response;
        }

        const imagemResponse = await enviarImagem(id, input.imagem);
        if (!imagemResponse.sucesso) {
          return imagemResponse;
        }

        return { ...imagemResponse, mensagens: response.mensagens };
      },
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
