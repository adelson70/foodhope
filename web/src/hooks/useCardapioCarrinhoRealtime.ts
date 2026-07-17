import { useEffect } from 'react';

import { socket } from '../services/socket';
import { useCarrinhoStore } from '../stores/carrinho.store';

export type CardapioProdutoEvento = {
  id: string;
  ativo: boolean;
};

export type CardapioAdicionalEvento = {
  id: string;
  ativo: boolean;
  escopo: 'global' | 'produto';
  produtoId?: string;
};

export function useCardapioCarrinhoRealtime() {
  const removeByProdutoId = useCarrinhoStore((s) => s.removeByProdutoId);
  const removeAdicionalId = useCarrinhoStore((s) => s.removeAdicionalId);

  useEffect(() => {
    function onProduto(payload: CardapioProdutoEvento) {
      if (!payload?.id || payload.ativo) return;
      removeByProdutoId(payload.id);
    }

    function onAdicional(payload: CardapioAdicionalEvento) {
      if (!payload?.id || payload.ativo) return;
      removeAdicionalId(payload.id);
    }

    socket.on('cardapio:produto', onProduto);
    socket.on('cardapio:adicional', onAdicional);
    return () => {
      socket.off('cardapio:produto', onProduto);
      socket.off('cardapio:adicional', onAdicional);
    };
  }, [removeByProdutoId, removeAdicionalId]);
}
