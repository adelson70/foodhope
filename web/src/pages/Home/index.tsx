import { useCallback, useEffect, useRef, useState } from 'react';

import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useDeferredLoading } from '../../hooks/useDeferredLoading';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { getApiErrorMensagens, produtoService } from '../../services';
import type { Produto } from '../../services/types';
import { HomeLista } from './HomeLista';
import { HomeSearch } from './HomeSearch';
import { HomeSkeleton } from './HomeSkeleton';

const LISTAR_LIMIT = 20;

export function Home() {
  const [buscaInput, setBuscaInput] = useState('');
  const busca = useDebouncedValue(buscaInput.trim());
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const initialPending = loading && produtos.length === 0;
  const showSkeleton = useDeferredLoading(initialPending);
  const showMoreSkeleton = useDeferredLoading(loadingMore);
  const buscaRef = useRef(busca);
  buscaRef.current = busca;
  const nextCursorRef = useRef<string | null>(null);

  const carregar = useCallback(async (termo: string) => {
    setLoading(true);
    setErro(null);
    setHasNextPage(false);
    nextCursorRef.current = null;

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

  const sentinelRef = useInfiniteScroll({
    enabled: hasNextPage && !loading && !loadingMore && !busca,
    onLoadMore: carregarMais,
  });

  return (
    <div className="flex flex-col gap-4 p-4">
      <HomeSearch value={buscaInput} onChange={setBuscaInput} />

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
        />
      )}
    </div>
  );
}
