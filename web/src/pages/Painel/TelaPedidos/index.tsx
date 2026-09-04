import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { FoodHopeLogo } from '../../../components/brand/FoodHopeLogo';
import { useDeferredLoading } from '../../../hooks/useDeferredLoading';
import { hojeSpIso, utcParaSpIso } from '../../../lib/dataSp';
import {
  connectSocket,
  getApiErrorMensagens,
  socket,
  TELA_PEDIDOS_PRONTOS,
  telaPedidosService,
} from '../../../services';
import type { Pedido } from '../../../services/types';
import { TelaPedidosLista } from './TelaPedidosLista';

const LISTAR_LIMIT = 24;

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
      void connectSocket();
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

        setPedidos(response.dados.pedidos ?? []);
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
      if (
        pedido.createdAt &&
        utcParaSpIso(pedido.createdAt) !== hojeSpIso()
      ) {
        return;
      }

      setPedidos((atual) => {
        if (atual.some((item) => item.id === pedido.id)) return atual;
        return [pedido, ...atual].slice(0, LISTAR_LIMIT);
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

  return (
    <div className="flex min-h-dvh flex-col bg-background text-on-background">
      <header className="flex items-center justify-between gap-3 border-b border-outline-variant/50 bg-surface/90 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <FoodHopeLogo
          markClassName="size-14"
          wordmarkClassName="text-headline-lg-mobile tracking-[0.2em]"
        />
      </header>

      <main className="flex-1 overflow-y-auto overscroll-y-contain px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <TelaPedidosLista
          pedidos={pedidos}
          loading={showSkeleton}
          pending={loading && !showSkeleton && pedidos.length === 0}
          erro={erro}
        />
      </main>
    </div>
  );
}
