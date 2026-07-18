import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type CardapioAdicionalEvento,
  type CardapioProdutoEvento,
} from '../../hooks/useCardapioCarrinhoRealtime';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useDeferredLoading } from '../../hooks/useDeferredLoading';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { getApiErrorMensagens, produtoService, socket } from '../../services';
import type { Produto, ProdutoCategoria } from '../../services/types';
import {
  HOME_CATEGORIA_OUTROS,
  homeCategoriaAnchorId,
  HomeCategoriaPills,
  type HomeCategoriaPill,
} from './HomeCategoriaPills';
import { HomeLista } from './HomeLista';
import { HomeProdutoDrawer } from './HomeProdutoDrawer';
import { HomeSearch } from './HomeSearch';
import { HomeSkeleton } from './HomeSkeleton';

const LISTAR_LIMIT = 20;

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

function montarPills(
  categorias: ProdutoCategoria[],
  temOutros: boolean,
): HomeCategoriaPill[] {
  const pills = categorias.map((item) => ({
    id: item.id,
    nome: item.nome,
  }));
  if (temOutros) {
    pills.push({ id: HOME_CATEGORIA_OUTROS, nome: 'Outros' });
  }
  return pills;
}

function scrollParaSecao(categoriaId: string) {
  const el = document.getElementById(homeCategoriaAnchorId(categoriaId));
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

export function Home() {
  const [buscaInput, setBuscaInput] = useState('');
  const busca = useDebouncedValue(buscaInput.trim());
  const [pills, setPills] = useState<HomeCategoriaPill[]>([]);
  const [pillAtiva, setPillAtiva] = useState<string | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(
    null,
  );
  const initialPending = loading && produtos.length === 0;
  const showSkeleton = useDeferredLoading(initialPending);
  const showMoreSkeleton = useDeferredLoading(loadingMore);
  const buscaRef = useRef(busca);
  buscaRef.current = busca;
  const nextCursorRef = useRef<string | null>(null);
  const pendingScrollRef = useRef<string | null>(null);
  const hasNextPageRef = useRef(false);
  hasNextPageRef.current = hasNextPage;

  const carregar = useCallback(async (termo: string) => {
    setLoading(true);
    setErro(null);
    setHasNextPage(false);
    nextCursorRef.current = null;
    pendingScrollRef.current = null;

    try {
      if (termo) {
        const response = await produtoService.buscar(termo);
        if (!response.sucesso || !response.dados) {
          setErro('Não foi possível buscar o cardápio.');
          setProdutos([]);
          return;
        }
        setProdutos(response.dados.produtos ?? []);
        return;
      }

      const response = await produtoService.listar({ limit: LISTAR_LIMIT });
      if (!response.sucesso || !response.dados) {
        setErro('Não foi possível carregar o cardápio.');
        setProdutos([]);
        return;
      }
      setProdutos(response.dados.data ?? []);
      setHasNextPage(response.dados.meta.hasNextPage);
      nextCursorRef.current = response.dados.meta.nextCursor;
      if (response.dados.meta.categorias) {
        setPills(
          montarPills(
            response.dados.meta.categorias,
            Boolean(response.dados.meta.temOutros),
          ),
        );
      }
    } catch (error: unknown) {
      const mensagens = getApiErrorMensagens(error);
      setErro(mensagens[0] ?? 'Não foi possível carregar o cardápio.');
      setProdutos([]);
      setHasNextPage(false);
      nextCursorRef.current = null;
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarMais = useCallback(async () => {
    if (buscaRef.current || !nextCursorRef.current) return;

    const cursor = nextCursorRef.current;
    setLoadingMore(true);

    try {
      const response = await produtoService.listar({
        limit: LISTAR_LIMIT,
        cursor,
      });
      if (!response.sucesso || !response.dados) return;

      const novos = response.dados.data ?? [];
      setProdutos((atual) => {
        const ids = new Set(atual.map((item) => item.id));
        return [...atual, ...novos.filter((item) => !ids.has(item.id))];
      });
      setHasNextPage(response.dados.meta.hasNextPage);
      nextCursorRef.current = response.dados.meta.nextCursor;
    } catch {
      return;
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void carregar(busca);
  }, [busca, carregar]);

  useEffect(() => {
    function onProduto(payload: CardapioProdutoEvento) {
      if (!payload?.id) return;
      setProdutos((atual) =>
        atual.map((produto) => aplicarProdutoAtivo(produto, payload)),
      );
      setProdutoSelecionado((atual) =>
        atual ? aplicarProdutoAtivo(atual, payload) : atual,
      );
    }

    function onAdicional(payload: CardapioAdicionalEvento) {
      if (!payload?.id) return;
      setProdutos((atual) =>
        atual.map((produto) => aplicarAdicionalAtivo(produto, payload)),
      );
      setProdutoSelecionado((atual) =>
        atual ? aplicarAdicionalAtivo(atual, payload) : atual,
      );
    }

    socket.on('cardapio:produto', onProduto);
    socket.on('cardapio:adicional', onAdicional);
    return () => {
      socket.off('cardapio:produto', onProduto);
      socket.off('cardapio:adicional', onAdicional);
    };
  }, []);

  useEffect(() => {
    const alvo = pendingScrollRef.current;
    if (!alvo || loadingMore) return;

    if (scrollParaSecao(alvo)) {
      pendingScrollRef.current = null;
      return;
    }

    if (hasNextPageRef.current) {
      void carregarMais();
      return;
    }

    pendingScrollRef.current = null;
  }, [produtos, loadingMore, carregarMais]);

  const sentinelRef = useInfiniteScroll({
    enabled:
      hasNextPage &&
      !loading &&
      !loadingMore &&
      !busca &&
      !pendingScrollRef.current,
    onLoadMore: carregarMais,
  });

  function handlePillSelect(categoriaId: string) {
    setPillAtiva(categoriaId);
    if (scrollParaSecao(categoriaId)) {
      pendingScrollRef.current = null;
      return;
    }
    pendingScrollRef.current = categoriaId;
    if (hasNextPage && !loadingMore && !busca) {
      void carregarMais();
    }
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-background px-4 pt-4 pb-3">
        <div className="flex flex-col gap-3">
          <HomeSearch value={buscaInput} onChange={setBuscaInput} />
          <HomeCategoriaPills
            pills={pills}
            ativoId={pillAtiva}
            onSelect={handlePillSelect}
          />
        </div>
      </div>

      <div className="px-4 pb-4">
        {showSkeleton ? (
          <HomeSkeleton />
        ) : initialPending ? (
          <div
            className="min-h-40"
            aria-busy="true"
            aria-label="Carregando cardápio"
          />
        ) : (
          <HomeLista
            produtos={produtos}
            loadingMore={showMoreSkeleton}
            hasNextPage={hasNextPage && !busca}
            erro={erro}
            buscaAtiva={Boolean(busca)}
            sentinelRef={sentinelRef}
            onSelect={setProdutoSelecionado}
          />
        )}
      </div>

      <HomeProdutoDrawer
        produto={produtoSelecionado}
        open={Boolean(produtoSelecionado)}
        onClose={() => setProdutoSelecionado(null)}
      />
    </div>
  );
}
