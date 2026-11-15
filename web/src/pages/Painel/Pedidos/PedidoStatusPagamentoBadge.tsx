import { cn } from '../../../lib/cn';
import {
  rotuloMeioPagamento,
  rotuloStatusPagamento,
} from '../../../lib/statusPagamento';
import type { StatusPagamento } from '../../../services/types';

type PedidoStatusPagamentoBadgeProps = {
  status?: StatusPagamento | null;
  /** Com o pedido pago, mostra o meio junto: "Pago · Pix". */
  meio?: string | null;
  parcelas?: number | null;
  mostrarMeio?: boolean;
  className?: string;
};

export function PedidoStatusPagamentoBadge({
  status,
  meio,
  parcelas,
  mostrarMeio = true,
  className,
}: PedidoStatusPagamentoBadgeProps) {
  const efetivo = status ?? 'PAGO';

  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-label-sm font-medium',
        efetivo === 'NAO_PAGO' && 'bg-danger/15 text-danger',
        efetivo === 'GRATUITO' &&
          'bg-primary-container/40 text-on-surface',
        efetivo === 'PAGO' && 'bg-success/15 text-success',
        className,
      )}
    >
      {rotuloStatusPagamento(efetivo)}
      {mostrarMeio && efetivo === 'PAGO'
        ? ` · ${rotuloMeioPagamento(meio, parcelas)}`
        : null}
    </span>
  );
}
