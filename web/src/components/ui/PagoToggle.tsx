import { cn } from '../../lib/cn';
import { STATUS_PAGAMENTO_OPCOES } from '../../lib/statusPagamento';
import type { StatusPagamento } from '../../services/types';

type PagoToggleProps = {
  value: StatusPagamento;
  onChange: (value: StatusPagamento) => void;
  disabled?: boolean;
};

export function PagoToggle({ value, onChange, disabled }: PagoToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Status de pagamento"
      className="grid grid-cols-3 gap-2"
    >
      {STATUS_PAGAMENTO_OPCOES.map((opcao) => {
        const ativo = value === opcao.value;
        return (
          <button
            key={opcao.value}
            type="button"
            role="radio"
            aria-checked={ativo}
            disabled={disabled}
            onClick={() => onChange(opcao.value)}
            className={cn(
              'rounded-xl border px-3 py-3 text-body-md font-medium transition-colors',
              'disabled:opacity-50',
              ativo
                ? 'border-primary bg-primary-container/40 text-on-surface'
                : 'border-operator-border bg-operator-card text-on-surface-variant hover:text-on-surface',
            )}
          >
            {opcao.label}
          </button>
        );
      })}
    </div>
  );
}
