import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useDeferredLoading } from '../../../hooks/useDeferredLoading';
import {
  connectSocket,
  disconnectSocket,
  getApiErrorMensagens,
  isTelaPedidosPublicaPath,
  socket,
  TELA_PEDIDOS_PRONTOS,
  telaPedidosService,
} from '../../../services';
import type { Pedido } from '../../../services/types';
import {
  PEDIDOS_POR_TELA,
  TelaPedidosLista,
} from './TelaPedidosLista';

const BUFFER_LIMIT = 24;

export function TelaPedidos() {
  const { hash } = useParams<{ hash: string }>();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const showSkeleton = useDeferredLoading(loading && pedidos.length === 0);

  useEffect(() => {
    if (!hash) return;

    void connectSocket({
      tela: TELA_PEDIDOS_PRONTOS,
      monitorHash: hash,
      label: 'Tela de pedidos prontos',
    });

    return () => {
      disconnectSocket();
      if (!isTelaPedidosPublicaPath()) {
        void connectSocket();
      }
    };
  }, [hash]);

  useEffect(() => {
    if (!hash) {
      setLoading(false);
      setErro('Link da tela de pedidos inválido.');
      return;
    }

    let cancelled = false;

    async function carregar() {
      setLoading(true);
      setErro(null);

      try {
        const response = await telaPedidosService.listarPublico(hash!);
        if (cancelled) return;

        if (!response.sucesso || !response.dados) {
          setErro('Não foi possível carregar os pedidos.');
          setPedidos([]);
          return;
        }

        setPedidos((response.dados.pedidos ?? []).slice(0, BUFFER_LIMIT));
      } catch (error: unknown) {
        if (cancelled) return;
        const mensagens = getApiErrorMensagens(error);
        setErro(mensagens[0] ?? 'Não foi possível carregar os pedidos.');
        setPedidos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void carregar();

    return () => {
      cancelled = true;
    };
  }, [hash]);

  useEffect(() => {
    function onPedidoSaiu(pedido: Pedido) {
      setPedidos((atual) => {
        if (atual.some((item) => item.id === pedido.id)) return atual;
        return [pedido, ...atual].slice(0, BUFFER_LIMIT);
      });
    }

    socket.on('pedido:saiu', onPedidoSaiu);
    return () => {
      socket.off('pedido:saiu', onPedidoSaiu);
    };
  }, []);

  useEffect(() => {
    function onPedidoDeletado(payload: { id?: string }) {
      if (!payload?.id) return;
      setPedidos((atual) => atual.filter((item) => item.id !== payload.id));
    }

    socket.on('pedido:deletado', onPedidoDeletado);
    return () => {
      socket.off('pedido:deletado', onPedidoDeletado);
    };
  }, []);

  const pedidosVisiveis = pedidos.slice(0, PEDIDOS_POR_TELA);

  return (
    <div className="flex h-dvh flex-col bg-neutral-900 text-surface-container-low">
      <header className="flex shrink-0 items-center justify-center bg-success px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] shadow-card">
        <h1 className="text-center font-extrabold uppercase leading-none tracking-[0.08em] text-surface-container-low text-[10vh]">
          PEDIDOS PRONTOS
        </h1>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-1.5 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        <div className="min-h-0 flex-1">
          <TelaPedidosLista
            pedidos={pedidosVisiveis}
            loading={showSkeleton}
            pending={loading && !showSkeleton && pedidos.length === 0}
            erro={erro}
          />
        </div>
      </main>
    </div>
  );
}
