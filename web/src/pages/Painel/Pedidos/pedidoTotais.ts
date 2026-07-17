import type { Pedido, PedidoItem } from '../../../services/types';
import { formatarMoeda } from '../../../lib/currency';

export { formatarMoeda };

export function totalItem(item: PedidoItem): number {
  const base = Number(item.preco_produto) * item.quantidade;
  const adicionais = (item.adicional_venda ?? []).reduce(
    (soma, adicional) => soma + Number(adicional.preco) * adicional.qtd,
    0,
  );
  return base + adicionais;
}

export function totalPedido(pedido: Pedido): number {
  return (pedido.itens ?? []).reduce((soma, item) => soma + totalItem(item), 0);
}


export function formatarDataPedido(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
