import { Check, Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui';
import { rotuloTipoConsumo } from '../../../lib/tipoConsumo';
import type { Pedido } from '../../../services/types';
import {
  formatarDataPedido,
  formatarMoeda,
  pedidoEstaPronto,
  totalPedido,
} from './pedidoTotais';

type PedidoCardProps = {
  pedido: Pedido;
  prontoLoading: boolean;
  pagoLoading: boolean;
  onSelect: (pedido: Pedido) => void;
  onPronto: (pedido: Pedido) => void;
  onMarcarPago: (pedido: Pedido) => void;
  onDelete: (pedido: Pedido) => void;
};

export function PedidoCard({
  pedido,
  prontoLoading,
  pagoLoading,
  onSelect,
  onPronto,
  onMarcarPago,
  onDelete,
}: PedidoCardProps) {
  const nomesItens = (pedido.itens ?? [])
    .map((item) => item.produto?.nome ?? 'Item')
    .slice(0, 3);
  const restantes = (pedido.itens?.length ?? 0) - nomesItens.length;
  const pronto = pedidoEstaPronto(pedido);
  const pago = pedido.pago !== false;

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
            {pago ? (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-label-sm font-medium text-success">
                Pago
              </span>
            ) : (
              <span className="rounded-full bg-danger/15 px-2 py-0.5 text-label-sm font-medium text-danger">
                Não pago
              </span>
            )}
            {pronto ? (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-label-sm font-medium text-success">
                Pronto
              </span>
            ) : null}
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
        </button>
        {!pronto ? (
          <Button
            type="button"
            variant="success"
            aria-label={`Marcar pedido ${pedido.numero} como pronto`}
            className="size-10 shrink-0 px-0 py-0"
            disabled={prontoLoading}
            onClick={() => onPronto(pedido)}
          >
            <Check size={17} strokeWidth={1.75} />
          </Button>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-body-md font-medium text-on-surface">
          {formatarMoeda(totalPedido(pedido))}
        </p>
        <div className="flex items-center gap-2">
          {!pago ? (
            <Button
              type="button"
              variant="secondary"
              className="h-10 px-3"
              disabled={pagoLoading}
              onClick={() => onMarcarPago(pedido)}
            >
              {pagoLoading ? '…' : 'Marcar pago'}
            </Button>
          ) : null}
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
      </div>
    </article>
  );
}
