import { cn } from '../../lib/cn';

type PagoToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

const OPCOES: Array<{ value: boolean; label: string }> = [
  { value: true, label: 'Pago' },
  { value: false, label: 'Não pago' },
];

export function PagoToggle({ value, onChange, disabled }: PagoToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Status de pagamento"
      className="grid grid-cols-2 gap-2"
    >
      {OPCOES.map((opcao) => {
        const ativo = value === opcao.value;
        return (
          <button
            key={String(opcao.value)}
            type="button"
            role="radio"
            aria-checked={ativo}
            disabled={disabled}
            onClick={() => onChange(opcao.value)}
            className={cn(
              'rounded-xl border px-4 py-3 text-body-md font-medium transition-colors',
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
