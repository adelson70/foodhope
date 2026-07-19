import type { LucideIcon } from 'lucide-react';

import { cn } from '../../../lib/cn';
import type { TipoRelatorio } from '../../../services/types';

type RelatorioCardProps = {
  tipo: TipoRelatorio;
  titulo: string;
  descricao: string;
  icon: LucideIcon;
  gerando: boolean;
  disabled?: boolean;
  onGerar: (tipo: TipoRelatorio) => void;
};

export function RelatorioCard({
  tipo,
  titulo,
  descricao,
  icon: Icon,
  gerando,
  disabled = false,
  onGerar,
}: RelatorioCardProps) {
  return (
    <button
      type="button"
      disabled={disabled || gerando}
      onClick={() => onGerar(tipo)}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border border-operator-border bg-operator-card p-4 text-left shadow-card transition-colors',
        'hover:border-primary/40',
        'disabled:pointer-events-none disabled:opacity-60',
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/30 text-primary">
        <Icon size={19} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-md font-medium text-on-surface">
          {gerando ? 'Gerando…' : titulo}
        </span>
        <span className="block text-caption text-on-surface-variant">
          {descricao}
        </span>
      </span>
    </button>
  );
}
