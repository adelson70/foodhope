import { useEffect } from 'react';

import {
  loadPedidosLocais,
  marcarPedidoLocalPronto,
} from '../lib/clienteStorage';
import { notifySuccess } from '../services/notify';
import { socket } from '../services/socket';

type PedidoProntoPayload = {
  id?: string;
  numero?: string;
  prontoAt?: string | null;
};

export function usePedidoProntoRealtime() {
  useEffect(() => {
    async function onPedidoPronto(payload: PedidoProntoPayload) {
      if (!payload?.id) return;

      const locais = await loadPedidosLocais();
      if (!locais.some((p) => p.id === payload.id)) return;

      const atualizado = await marcarPedidoLocalPronto(
        payload.id,
        payload.prontoAt,
      );
      if (!atualizado) return;

      notifySuccess(
        [`Seu pedido #${atualizado.numero} está pronto para retirada.`],
        `Seu pedido #${atualizado.numero} está pronto para retirada.`,
      );
      window.dispatchEvent(
        new CustomEvent('foodhope:pedido-pronto', { detail: atualizado }),
      );
    }

    socket.on('pedido:pronto', onPedidoPronto);
    return () => {
      socket.off('pedido:pronto', onPedidoPronto);
    };
  }, []);
}
