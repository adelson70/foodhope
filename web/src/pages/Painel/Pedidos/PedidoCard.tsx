import { Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui';
import { rotuloTipoConsumo } from '../../../lib/tipoConsumo';
import type { Pedido } from '../../../services/types';
import {
  formatarDataPedido,
  formatarMoeda,
  totalPedido,
} from './pedidoTotais';

type PedidoCardProps = {
  pedido: Pedido;
  onSelect: (pedido: Pedido) => void;
  onDelete: (pedido: Pedido) => void;
};

export function PedidoCard({ pedido, onSelect, onDelete }: PedidoCardProps) {
  const nomesItens = (pedido.itens ?? [])
    .map((item) => item.produto?.nome ?? 'Item')
    .slice(0, 3);
  const restantes = (pedido.itens?.length ?? 0) - nomesItens.length;

  return (
    <article className="rounded-xl border border-operator-border bg-operator-card p-4">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onSelect(pedido)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-label-sm uppercase tracking-widest text-primary-container">
              #{pedido.numero}
            </span>
            <span className="text-caption text-on-surface-variant">
              {formatarDataPedido(pedido.createdAt)}
            </span>
            <span className="rounded-full bg-primary-container/40 px-2 py-0.5 text-label-sm font-medium text-on-surface">
              {rotuloTipoConsumo(pedido.tipo_consumo)}
            </span>
          </div>
          <h2 className="mt-1 truncate text-subtitle-md font-medium text-on-surface">
            {pedido.nome_completo}
          </h2>
          {nomesItens.length > 0 ? (
            <p className="mt-1 text-caption text-on-surface-variant">
              {nomesItens.join(', ')}
              {restantes > 0 ? ` +${restantes}` : ''}
            </p>
          ) : null}
          <p className="mt-2 text-body-md font-medium text-on-surface">
            {formatarMoeda(totalPedido(pedido))}
          </p>
        </button>
        <Button
          type="button"
          variant="dangerGhost"
          aria-label={`Excluir pedido ${pedido.numero}`}
          className="size-10 shrink-0 px-0 py-0"
          onClick={() => onDelete(pedido)}
        >
          <Trash2 size={17} strokeWidth={1.75} />
        </Button>
      </div>
    </article>
  );
}
