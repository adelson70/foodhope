import { cn } from '../../lib/cn';
import { TIPO_CONSUMO_OPCOES } from '../../lib/tipoConsumo';
import type { TipoConsumo } from '../../services/types';

type TipoConsumoToggleProps = {
  value: TipoConsumo;
  onChange: (value: TipoConsumo) => void;
  disabled?: boolean;
};

export function TipoConsumoToggle({
  value,
  onChange,
  disabled,
}: TipoConsumoToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Tipo de consumo"
      className="grid grid-cols-2 gap-2"
    >
      {TIPO_CONSUMO_OPCOES.map((opcao) => {
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
