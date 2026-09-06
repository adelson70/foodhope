import { cn } from '../../../lib/cn';
import { rotuloStatusPagamento } from '../../../lib/statusPagamento';
import type { StatusPagamento } from '../../../services/types';

type PedidoStatusPagamentoBadgeProps = {
  status?: StatusPagamento | null;
  className?: string;
};

export function PedidoStatusPagamentoBadge({
  status,
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
    </span>
  );
}
