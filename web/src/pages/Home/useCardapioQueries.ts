import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';

import {
  type CardapioAdicionalEvento,
  type CardapioProdutoEvento,
} from '../../hooks/useCardapioCarrinhoRealtime';
import { produtoService } from '../../services';
import type {
  BuscarProdutosDados,
  ListarProdutosDados,
  Produto,
} from '../../services/types';

const LISTAR_LIMIT = 20;

export const cardapioKeys = {
  all: ['cardapio'] as const,
  lista: () => ['cardapio', 'lista'] as const,
  busca: (termo: string) => ['cardapio', 'busca', termo] as const,
};

function aplicarProdutoAtivo(
  produto: Produto,
  payload: CardapioProdutoEvento,
): Produto {
  if (produto.id !== payload.id) return produto;
  return { ...produto, ativo: payload.ativo };
}

function aplicarAdicionalAtivo(
  produto: Produto,
  payload: CardapioAdicionalEvento,
): Produto {
  if (payload.escopo === 'produto' && payload.produtoId !== produto.id) {
    return produto;
  }

  const patchLista = <T extends { id: string; ativo?: boolean }>(
    lista: T[] | undefined,
  ): T[] | undefined => {
    if (!lista) return lista;
    return lista.map((item) =>
      item.id === payload.id ? { ...item, ativo: payload.ativo } : item,
    );
  };

  return {
    ...produto,
    adicionais: patchLista(produto.adicionais),
    adicionaisEspecificos: patchLista(produto.adicionaisEspecificos),
  };
}

function patchListaProdutos(
  produtos: Produto[],
  payload: CardapioProdutoEvento | CardapioAdicionalEvento,
  tipo: 'produto' | 'adicional',
): Produto[] {
  return produtos.map((produto) =>
    tipo === 'produto'
      ? aplicarProdutoAtivo(produto, payload as CardapioProdutoEvento)
      : aplicarAdicionalAtivo(produto, payload as CardapioAdicionalEvento),
  );
}

export function patchCardapioCache(
  queryClient: QueryClient,
  payload: CardapioProdutoEvento | CardapioAdicionalEvento,
  tipo: 'produto' | 'adicional',
) {
  queryClient.setQueryData<InfiniteData<ListarProdutosDados>>(
    cardapioKeys.lista(),
    (atual) => {
      if (!atual) return atual;
      return {
        ...atual,
        pages: atual.pages.map((page) => ({
          ...page,
          data: patchListaProdutos(page.data, payload, tipo),
        })),
      };
    },
  );

  queryClient.setQueriesData<BuscarProdutosDados>(
    { queryKey: [...cardapioKeys.all, 'busca'] },
    (atual) => {
      if (!atual) return atual;
      return {
        ...atual,
        produtos: patchListaProdutos(atual.produtos, payload, tipo),
      };
    },
  );
}

export function useCardapioInfinito() {
  return useInfiniteQuery({
    queryKey: cardapioKeys.lista(),
    queryFn: async ({ pageParam }) => {
      const response = await produtoService.listar({
        limit: LISTAR_LIMIT,
        cursor: pageParam,
      });
      if (!response.sucesso || !response.dados) {
        throw new Error('Não foi possível carregar o cardápio.');
      }
      return response.dados;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage
        ? (lastPage.meta.nextCursor ?? undefined)
        : undefined,
  });
}

export function useCardapioBusca(termo: string) {
  return useQuery({
    queryKey: cardapioKeys.busca(termo),
    queryFn: async () => {
      const response = await produtoService.buscar(termo);
      if (!response.sucesso || !response.dados) {
        throw new Error('Não foi possível buscar o cardápio.');
      }
      return response.dados;
    },
    enabled: Boolean(termo),
    placeholderData: keepPreviousData,
  });
}

export { aplicarProdutoAtivo, aplicarAdicionalAtivo };
