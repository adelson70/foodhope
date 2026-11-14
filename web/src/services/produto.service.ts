import { api, request } from './api';
import { withMutationToast } from './mutation-toast';
import type {
  ApiResponse,
  BuscarProdutosDados,
  CriarProdutoInput,
  EditarProdutoInput,
  ListarProdutosDados,
  Produto,
  VariacaoImagemAcao,
} from './types';

export type ListarProdutosParams = {
  cursor?: string;
  limit?: number;
};

function toProdutoJson(input: CriarProdutoInput | EditarProdutoInput) {
  const dados: Partial<EditarProdutoInput> = { ...input };
  delete dados.imagem;
  delete dados.removerImagem;
  delete dados.variacaoImagens;
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

async function apagarImagem(id: string): Promise<ApiResponse<Produto>> {
  return request(
    api.delete<ApiResponse<Produto>>(`/produto/${id}/imagem`),
  );
}

/**
 * Envia/remove as fotos das variações depois que o produto foi salvo.
 * Variações novas só têm id após salvar, então são casadas pelo nome.
 */
async function aplicarImagensVariacoes(
  produtoId: string,
  produtoSalvo: Produto | null,
  acoes: VariacaoImagemAcao[] | undefined,
): Promise<ApiResponse<Produto> | null> {
  if (!acoes || acoes.length === 0) return null;

  let ultima: ApiResponse<Produto> | null = null;
  for (const acao of acoes) {
    const nome = acao.nome.trim().toLowerCase();
    const variacaoId =
      acao.id ??
      produtoSalvo?.variacoes?.find((v) => v.nome.trim().toLowerCase() === nome)
        ?.id;
    if (!variacaoId) continue;

    const resposta = acao.imagem
      ? await request(
          api.put<ApiResponse<Produto>>(
            `/produto/${produtoId}/variacao/${variacaoId}/imagem`,
            toImagemFormData(acao.imagem),
          ),
        )
      : await request(
          api.delete<ApiResponse<Produto>>(
            `/produto/${produtoId}/variacao/${variacaoId}/imagem`,
          ),
        );
    if (!resposta.sucesso) return resposta;
    ultima = resposta;
  }
  return ultima;
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

        if (!response.sucesso || !response.dados?.id) {
          return response;
        }

        let atual = response;
        if (input.imagem) {
          const imagemResponse = await enviarImagem(response.dados.id, input.imagem);
          if (!imagemResponse.sucesso) {
            return imagemResponse;
          }
          atual = { ...imagemResponse, mensagens: response.mensagens };
        }

        const variacoesResponse = await aplicarImagensVariacoes(
          response.dados.id,
          response.dados,
          input.variacaoImagens,
        );
        if (variacoesResponse && !variacoesResponse.sucesso) {
          return variacoesResponse;
        }
        if (variacoesResponse) {
          atual = { ...variacoesResponse, mensagens: response.mensagens };
        }

        return atual;
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

        if (!response.sucesso) {
          return response;
        }

        let atual: ApiResponse<Produto | { mensagem: string }> = response;

        if (input.imagem) {
          const imagemResponse = await enviarImagem(id, input.imagem);
          if (!imagemResponse.sucesso) {
            return imagemResponse;
          }
          atual = { ...imagemResponse, mensagens: response.mensagens };
        } else if (input.removerImagem) {
          const remocaoResponse = await apagarImagem(id);
          if (!remocaoResponse.sucesso) {
            return remocaoResponse;
          }
          atual = { ...remocaoResponse, mensagens: response.mensagens };
        }

        const produtoSalvo =
          atual.dados && 'id' in atual.dados ? atual.dados : null;
        const variacoesResponse = await aplicarImagensVariacoes(
          id,
          produtoSalvo,
          input.variacaoImagens,
        );
        if (variacoesResponse && !variacoesResponse.sucesso) {
          return variacoesResponse;
        }
        if (variacoesResponse) {
          atual = { ...variacoesResponse, mensagens: response.mensagens };
        }

        return atual;
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
