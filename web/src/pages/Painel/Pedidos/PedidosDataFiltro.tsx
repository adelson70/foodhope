import { CalendarDays, X } from 'lucide-react';

import { Button, Input } from '../../../components/ui';
import { hojeSpIso, isoParaBr } from '../../../lib/dataSp';

type PedidosDataFiltroProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function PedidosDataFiltro({
  value,
  onChange,
  disabled,
}: PedidosDataFiltroProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Input
          type="text"
          readOnly
          tabIndex={-1}
          placeholder="Todos os dias"
          value={value ? isoParaBr(value) : ''}
          disabled={disabled}
          leftIcon={<CalendarDays size={17} strokeWidth={1.75} />}
          aria-hidden
          className="pointer-events-none"
        />
        <input
          type="date"
          lang="pt-BR"
          value={value}
          max={hojeSpIso()}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Filtrar pedidos por dia"
          className="absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </div>
      {value ? (
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          aria-label="Limpar filtro de data"
          onClick={() => onChange('')}
          className="shrink-0 px-4"
        >
          <X size={16} strokeWidth={1.75} />
          Todos
        </Button>
      ) : null}
    </div>
  );
}
