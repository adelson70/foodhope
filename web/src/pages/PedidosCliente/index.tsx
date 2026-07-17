import { useCallback, useEffect, useRef, useState } from 'react';

import { loadPedidosLocais, type PedidoLocal } from '../../lib/clienteStorage';
import { useDeferredLoading } from '../../hooks/useDeferredLoading';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { getVisitorId } from '../../services/visitor';
import { PedidoLocalCard } from './PedidoLocalCard';
import { PedidoLocalCardSkeleton } from './PedidoLocalCardSkeleton';
import { PedidoLocalDetalheDrawer } from './PedidoLocalDetalheDrawer';

const PAGE_SIZE = 20;

export function PedidosCliente() {
  const [todos, setTodos] = useState<PedidoLocal[]>([]);
  const [visiveis, setVisiveis] = useState<PedidoLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] =
    useState<PedidoLocal | null>(null);
  const offsetRef = useRef(0);
  const showSkeleton = useDeferredLoading(loading && visiveis.length === 0);
  const showMoreSkeleton = useDeferredLoading(loadingMore);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const visitorId = await getVisitorId();
      const lista = visitorId ? await loadPedidosLocais(visitorId) : [];
      setTodos(lista);
      const first = lista.slice(0, PAGE_SIZE);
      setVisiveis(first);
      offsetRef.current = first.length;
      setHasNextPage(lista.length > first.length);
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarMais = useCallback(async () => {
    if (!hasNextPage) return;
    setLoadingMore(true);
    try {
      const nextOffset = offsetRef.current;
      const slice = todos.slice(nextOffset, nextOffset + PAGE_SIZE);
      setVisiveis((atual) => [...atual, ...slice]);
      offsetRef.current = nextOffset + slice.length;
      setHasNextPage(offsetRef.current < todos.length);
    } finally {
      setLoadingMore(false);
    }
  }, [hasNextPage, todos]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const sentinelRef = useInfiniteScroll({
    enabled: hasNextPage && !loading && !loadingMore,
    onLoadMore: carregarMais,
  });

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-title-md text-on-surface">Meus pedidos</h2>
        <p className="text-caption text-on-surface-variant">
          Histórico deste aparelho
        </p>
      </div>

      {showSkeleton ? (
        <ul className="flex flex-col gap-3" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index}>
              <PedidoLocalCardSkeleton />
            </li>
          ))}
        </ul>
      ) : loading && visiveis.length === 0 ? (
        <div className="min-h-40" aria-busy="true" />
      ) : visiveis.length === 0 ? (
        <div className="rounded-xl border border-operator-border bg-operator-card px-4 py-8 text-center">
          <p className="text-body-md text-on-surface-variant">
            Você ainda não fez pedidos neste aparelho.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visiveis.map((pedido) => (
            <li key={pedido.id}>
              <PedidoLocalCard
                pedido={pedido}
                onSelect={setPedidoSelecionado}
              />
            </li>
          ))}
          {showMoreSkeleton
            ? Array.from({ length: 2 }, (_, index) => (
                <li key={`more-${index}`}>
                  <PedidoLocalCardSkeleton />
                </li>
              ))
            : null}
          {hasNextPage ? (
            <li aria-hidden>
              <div ref={sentinelRef} className="h-1" />
            </li>
          ) : null}
        </ul>
      )}

      <PedidoLocalDetalheDrawer
        pedido={pedidoSelecionado}
        open={Boolean(pedidoSelecionado)}
        onClose={() => setPedidoSelecionado(null)}
      />
    </div>
  );
}
