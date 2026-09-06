import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ConfirmDialog } from '../../../components/ui';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useDeferredLoading } from '../../../hooks/useDeferredLoading';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import {
  usePedidoOutboxItems,
} from '../../../hooks/usePedidoOutboxSync';
import { PULL_REFRESH_EVENT } from '../../../hooks/usePullToRefresh';
import { hojeSpIso } from '../../../lib/dataSp';
import { isNetworkFailure, isOfflineNow } from '../../../lib/network';
import {
  outboxParaPedidoLocal,
  PEDIDO_OUTBOX_SYNCED_EVENT,
  removerPedidoOutbox,
} from '../../../lib/pedidoOutbox';
import { pedidoPendentePagamento } from '../../../lib/statusPagamento';
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
import { pedidoEstaPronto } from './pedidoTotais';

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
  const [prontoLoadingId, setProntoLoadingId] = useState<string | null>(null);
  const [pagoLoadingId, setPagoLoadingId] = useState<string | null>(null);
  const showSkeleton = useDeferredLoading(loading && pedidos.length === 0);
  const showMoreSkeleton = useDeferredLoading(loadingMore);
  const buscaRef = useRef(busca);
  buscaRef.current = busca;
  const dataRef = useRef(data);
  dataRef.current = data;
  const nextCursorRef = useRef<string | null>(null);
  const { items: outboxItems } = usePedidoOutboxItems();

  const pedidosLocais = useMemo(
    () =>
      outboxItems
        .filter((item) => item.origem === 'painel')
        .map(outboxParaPedidoLocal),
    [outboxItems],
  );

  const pedidosExibidos = useMemo(() => {
    if (busca) return pedidos;
    const idsServidor = new Set(pedidos.map((p) => p.id));
    const locais = pedidosLocais.filter((p) => !idsServidor.has(p.id));
    return [...locais, ...pedidos];
  }, [busca, pedidos, pedidosLocais]);

  const carregar = useCallback(async (termo: string, dia: string) => {
    if (isOfflineNow()) {
      setLoading(false);
      setErro(null);
      setHasNextPage(false);
      nextCursorRef.current = null;
      return;
    }

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
      if (isNetworkFailure(error)) {
        setErro(null);
        setHasNextPage(false);
        nextCursorRef.current = null;
        return;
      }
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
    function onPullRefresh() {
      void carregar(buscaRef.current, dataRef.current);
    }
    window.addEventListener(PULL_REFRESH_EVENT, onPullRefresh);
    return () => {
      window.removeEventListener(PULL_REFRESH_EVENT, onPullRefresh);
    };
  }, [carregar]);

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

  useEffect(() => {
    function onPedidoPronto(pedido: Pedido) {
      setPedidos((atual) =>
        atual.map((item) => (item.id === pedido.id ? pedido : item)),
      );
      setPedidoDetalhe((atual) =>
        atual?.id === pedido.id ? pedido : atual,
      );
    }

    socket.on('pedido:pronto', onPedidoPronto);
    return () => {
      socket.off('pedido:pronto', onPedidoPronto);
    };
  }, []);

  useEffect(() => {
    function onPedidoPago(pedido: Pedido) {
      setPedidos((atual) =>
        atual.map((item) => (item.id === pedido.id ? pedido : item)),
      );
      setPedidoDetalhe((atual) =>
        atual?.id === pedido.id ? pedido : atual,
      );
    }

    socket.on('pedido:pago', onPedidoPago);
    return () => {
      socket.off('pedido:pago', onPedidoPago);
    };
  }, []);

  useEffect(() => {
    function onPedidoDeletado(payload: { id?: string }) {
      if (!payload?.id) return;
      const id = payload.id;
      setPedidos((atual) => atual.filter((item) => item.id !== id));
      setPedidoDetalhe((atual) => (atual?.id === id ? null : atual));
      setPedidoExcluir((atual) => (atual?.id === id ? null : atual));
    }

    socket.on('pedido:deletado', onPedidoDeletado);
    return () => {
      socket.off('pedido:deletado', onPedidoDeletado);
    };
  }, []);

  useEffect(() => {
    function onOutboxSynced(event: Event) {
      const detail = (event as CustomEvent<{
        clientRequestId: string;
        pedido: Pedido;
        origem: string;
      }>).detail;
      if (!detail || detail.origem !== 'painel') return;

      setPedidos((atual) => {
        const semLocal = atual.filter(
          (p) => p.id !== `local:${detail.clientRequestId}`,
        );
        if (semLocal.some((p) => p.id === detail.pedido.id)) return semLocal;
        if (buscaRef.current) return semLocal;
        if (dataRef.current && dataRef.current !== hojeSpIso()) return semLocal;
        return [detail.pedido, ...semLocal];
      });
    }

    window.addEventListener(PEDIDO_OUTBOX_SYNCED_EVENT, onOutboxSynced);
    return () => {
      window.removeEventListener(PEDIDO_OUTBOX_SYNCED_EVENT, onOutboxSynced);
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

  function handleQueued() {
    return;
  }

  async function handlePronto(pedido: Pedido) {
    if (pedido.pendingSync || pedido.syncFailed) return;
    if (pedidoEstaPronto(pedido) || prontoLoadingId) return;
    setProntoLoadingId(pedido.id);
    try {
      const response = await pedidoService.marcarPronto(pedido.id);
      const atualizado = response.dados?.pedido;
      if (!atualizado) return;
      setPedidos((atual) =>
        atual.map((item) => (item.id === atualizado.id ? atualizado : item)),
      );
      setPedidoDetalhe((atual) =>
        atual?.id === atualizado.id ? atualizado : atual,
      );
    } catch {
      return;
    } finally {
      setProntoLoadingId(null);
    }
  }

  async function handleMarcarPago(pedido: Pedido) {
    if (pedido.pendingSync || pedido.syncFailed) return;
    if (
      !pedidoPendentePagamento(pedido.status_pagamento) ||
      pagoLoadingId
    ) {
      return;
    }
    setPagoLoadingId(pedido.id);
    try {
      const response = await pedidoService.marcarPago(pedido.id);
      const atualizado = response.dados?.pedido;
      if (!atualizado) return;
      setPedidos((atual) =>
        atual.map((item) => (item.id === atualizado.id ? atualizado : item)),
      );
      setPedidoDetalhe((atual) =>
        atual?.id === atualizado.id ? atualizado : atual,
      );
    } catch {
      return;
    } finally {
      setPagoLoadingId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!pedidoExcluir) return;
    setDeleting(true);
    try {
      if (pedidoExcluir.clientRequestId && pedidoExcluir.id.startsWith('local:')) {
        await removerPedidoOutbox(pedidoExcluir.clientRequestId);
        setPedidoExcluir(null);
        setPedidoDetalhe((atual) =>
          atual?.id === pedidoExcluir.id ? null : atual,
        );
        return;
      }
      await pedidoService.deletar(pedidoExcluir.id);
      setPedidos((atual) =>
        atual.filter((p) => p.id !== pedidoExcluir.id),
      );
      setPedidoDetalhe((atual) =>
        atual?.id === pedidoExcluir.id ? null : atual,
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
        pedidos={pedidosExibidos}
        loading={showSkeleton}
        loadingMore={showMoreSkeleton}
        pending={loading && pedidos.length === 0 && !showSkeleton && pedidosLocais.length === 0}
        hasNextPage={hasNextPage && !busca}
        erro={erro}
        buscaAtiva={Boolean(busca)}
        filtroData={Boolean(data) && !busca}
        sentinelRef={sentinelRef}
        prontoLoadingId={prontoLoadingId}
        pagoLoadingId={pagoLoadingId}
        onSelect={(pedido) => {
          if (pedido.pendingSync || pedido.syncFailed) return;
          setPedidoDetalhe(pedido);
        }}
        onPronto={(pedido) => {
          void handlePronto(pedido);
        }}
        onMarcarPago={(pedido) => {
          void handleMarcarPago(pedido);
        }}
        onDelete={setPedidoExcluir}
      />

      <PedidoCriarDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={handleCreated}
        onQueued={handleQueued}
      />

      <PedidoDetalheDrawer
        pedido={pedidoDetalhe}
        open={Boolean(pedidoDetalhe)}
        prontoLoading={prontoLoadingId === pedidoDetalhe?.id}
        pagoLoading={pagoLoadingId === pedidoDetalhe?.id}
        onClose={() => setPedidoDetalhe(null)}
        onPronto={(pedido) => {
          void handlePronto(pedido);
        }}
        onMarcarPago={(pedido) => {
          void handleMarcarPago(pedido);
        }}
        onDelete={setPedidoExcluir}
      />

      <ConfirmDialog
        open={Boolean(pedidoExcluir)}
        title={
          pedidoExcluir?.id.startsWith('local:')
            ? 'Descartar pedido pendente?'
            : pedidoExcluir
              ? `Excluir pedido #${pedidoExcluir.numero}?`
              : 'Excluir pedido?'
        }
        description={
          pedidoExcluir?.id.startsWith('local:')
            ? 'Este pedido ainda não foi enviado ao servidor.'
            : 'Esta ação não pode ser desfeita.'
        }
        confirmLabel={
          pedidoExcluir?.id.startsWith('local:') ? 'Descartar' : 'Excluir'
        }
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
