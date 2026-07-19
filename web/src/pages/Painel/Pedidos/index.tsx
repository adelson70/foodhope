import { useCallback, useEffect, useRef, useState } from 'react';

import { ConfirmDialog } from '../../../components/ui';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useDeferredLoading } from '../../../hooks/useDeferredLoading';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { hojeSpIso } from '../../../lib/dataSp';
import {
  getApiErrorMensagens,
  pedidoService,
  socket,
} from '../../../services';
import type { Pedido } from '../../../services/types';
import { PedidoCriarDrawer } from './PedidoCriarDrawer';
import { PedidoDetalheDrawer } from './PedidoDetalheDrawer';
import { PedidosDataFiltro } from './PedidosDataFiltro';
import { PedidosHeader } from './PedidosHeader';
import { PedidosLista } from './PedidosLista';
import { PedidosSearch } from './PedidosSearch';

const LISTAR_LIMIT = 20;

export function Pedidos() {
  const [buscaInput, setBuscaInput] = useState('');
  const busca = useDebouncedValue(buscaInput.trim());
  const [data, setData] = useState(hojeSpIso);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pedidoDetalhe, setPedidoDetalhe] = useState<Pedido | null>(null);
  const [pedidoExcluir, setPedidoExcluir] = useState<Pedido | null>(null);
  const [deleting, setDeleting] = useState(false);
  const showSkeleton = useDeferredLoading(loading && pedidos.length === 0);
  const showMoreSkeleton = useDeferredLoading(loadingMore);
  const buscaRef = useRef(busca);
  buscaRef.current = busca;
  const dataRef = useRef(data);
  dataRef.current = data;
  const nextCursorRef = useRef<string | null>(null);

  const carregar = useCallback(async (termo: string, dia: string) => {
    setLoading(true);
    setErro(null);
    setHasNextPage(false);
    nextCursorRef.current = null;

    try {
      if (termo) {
        const response = await pedidoService.buscar(termo);
        if (!response.sucesso || !response.dados) {
          setErro('Não foi possível buscar pedidos.');
          setPedidos([]);
          return;
        }
        setPedidos(response.dados.pedidos ?? []);
        return;
      }

      const response = await pedidoService.listar({
        limit: LISTAR_LIMIT,
        data: dia || undefined,
      });
      if (!response.sucesso || !response.dados) {
        setErro('Não foi possível carregar os pedidos.');
        setPedidos([]);
        return;
      }
      setPedidos(response.dados.pedidos ?? []);
      setHasNextPage(response.dados.meta.hasNextPage);
      nextCursorRef.current = response.dados.meta.nextCursor;
    } catch (error: unknown) {
      const mensagens = getApiErrorMensagens(error);
      setErro(mensagens[0] ?? 'Não foi possível carregar os pedidos.');
      setPedidos([]);
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
      const response = await pedidoService.listar({
        limit: LISTAR_LIMIT,
        cursor,
        data: dataRef.current || undefined,
      });
      if (!response.sucesso || !response.dados) return;

      const novos = response.dados.pedidos ?? [];
      setPedidos((atual) => {
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
    void carregar(busca, data);
  }, [busca, data, carregar]);

  useEffect(() => {
    function onNovoPedido(pedido: Pedido) {
      if (buscaRef.current) return;
      if (dataRef.current && dataRef.current !== hojeSpIso()) return;

      setPedidos((atual) => {
        if (atual.some((p) => p.id === pedido.id)) return atual;
        return [pedido, ...atual];
      });
    }

    socket.on('novo-pedido', onNovoPedido);
    return () => {
      socket.off('novo-pedido', onNovoPedido);
    };
  }, []);

  const sentinelRef = useInfiniteScroll({
    enabled: hasNextPage && !loading && !loadingMore && !busca,
    onLoadMore: carregarMais,
  });

  function handleCreated(pedido: Pedido) {
    if (buscaRef.current) {
      void carregar(buscaRef.current, dataRef.current);
      return;
    }
    if (dataRef.current && dataRef.current !== hojeSpIso()) return;
    setPedidos((atual) => {
      if (atual.some((p) => p.id === pedido.id)) return atual;
      return [pedido, ...atual];
    });
  }

  async function handleConfirmDelete() {
    if (!pedidoExcluir) return;
    setDeleting(true);
    try {
      await pedidoService.deletar(pedidoExcluir.id);
      setPedidos((atual) =>
        atual.filter((p) => p.id !== pedidoExcluir.id),
      );
      setPedidoExcluir(null);
    } catch {
      return;
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PedidosHeader onNovo={() => setDrawerOpen(true)} />
      <PedidosSearch value={buscaInput} onChange={setBuscaInput} />
      <PedidosDataFiltro
        value={data}
        onChange={setData}
        disabled={Boolean(buscaInput.trim())}
      />
      <PedidosLista
        pedidos={pedidos}
        loading={showSkeleton}
        loadingMore={showMoreSkeleton}
        pending={loading && pedidos.length === 0 && !showSkeleton}
        hasNextPage={hasNextPage && !busca}
        erro={erro}
        buscaAtiva={Boolean(busca)}
        filtroData={Boolean(data) && !busca}
        sentinelRef={sentinelRef}
        onSelect={setPedidoDetalhe}
        onDelete={setPedidoExcluir}
      />

      <PedidoCriarDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={handleCreated}
      />

      <PedidoDetalheDrawer
        pedido={pedidoDetalhe}
        open={Boolean(pedidoDetalhe)}
        onClose={() => setPedidoDetalhe(null)}
      />

      <ConfirmDialog
        open={Boolean(pedidoExcluir)}
        title={
          pedidoExcluir
            ? `Excluir pedido #${pedidoExcluir.numero}?`
            : 'Excluir pedido?'
        }
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
        onCancel={() => {
          if (!deleting) setPedidoExcluir(null);
        }}
      />
    </div>
  );
}
