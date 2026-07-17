import { api, request } from './api';
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
    return request(
      api.post<ApiResponse<Produto>>('/produto', toProdutoFormData(input)),
    );
  },

  async editar(
    id: string,
    input: EditarProdutoInput,
  ): Promise<ApiResponse<Produto | { mensagem: string }>> {
    return request(
      api.put<ApiResponse<Produto | { mensagem: string }>>(
        `/produto/${id}`,
        toProdutoFormData(input),
      ),
    );
  },

  async deletar(id: string): Promise<ApiResponse<{ mensagem: string }>> {
    return request(
      api.delete<ApiResponse<{ mensagem: string }>>(`/produto/${id}`),
    );
  },
};
