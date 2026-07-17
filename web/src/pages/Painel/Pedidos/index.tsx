import { useCallback, useEffect, useRef, useState } from 'react';

import { ConfirmDialog } from '../../../components/ui';
import {
  getApiErrorMensagens,
  pedidoService,
  socket,
} from '../../../services';
import type { Pedido } from '../../../services/types';
import { PedidoCriarDrawer } from './PedidoCriarDrawer';
import { PedidosHeader } from './PedidosHeader';
import { PedidosLista } from './PedidosLista';
import { PedidosSearch } from './PedidosSearch';

const LISTAR_LIMIT = 50;
const BUSCA_DEBOUNCE_MS = 300;

export function Pedidos() {
  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca] = useState('');
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pedidoExcluir, setPedidoExcluir] = useState<Pedido | null>(null);
  const [deleting, setDeleting] = useState(false);
  const buscaRef = useRef(busca);
  buscaRef.current = busca;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusca(buscaInput.trim());
    }, BUSCA_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [buscaInput]);

  const carregar = useCallback(async (termo: string) => {
    setLoading(true);
    setErro(null);

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

      const response = await pedidoService.listar({ limit: LISTAR_LIMIT });
      if (!response.sucesso || !response.dados) {
        setErro('Não foi possível carregar os pedidos.');
        setPedidos([]);
        return;
      }
      setPedidos(response.dados.pedidos ?? []);
    } catch (error: unknown) {
      const mensagens = getApiErrorMensagens(error);
      setErro(mensagens[0] ?? 'Não foi possível carregar os pedidos.');
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar(busca);
  }, [busca, carregar]);

  useEffect(() => {
    function onNovoPedido(pedido: Pedido) {
      if (buscaRef.current) return;

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

  function handleCreated(pedido: Pedido) {
    if (buscaRef.current) {
      void carregar(buscaRef.current);
      return;
    }
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
      <PedidosLista
        pedidos={pedidos}
        loading={loading}
        erro={erro}
        buscaAtiva={Boolean(busca)}
        onDelete={setPedidoExcluir}
      />

      <PedidoCriarDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={handleCreated}
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
