import type { ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';

/** Rodapé do produto: quantidade de lanches ao lado do botão de adicionar (padrão iFood). */
export function HomeProdutoRodape({
  qtd,
  onChangeQtd,
  mostrarQtd = true,
  children,
}: {
  qtd: number;
  onChangeQtd: (qtd: number) => void;
  mostrarQtd?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      {mostrarQtd ? (
        <div className="flex h-12 shrink-0 items-center rounded-xl border border-operator-border bg-operator-card">
          <button
            type="button"
            className="flex size-12 items-center justify-center text-primary transition-colors disabled:text-on-surface-variant disabled:opacity-40"
            aria-label="Diminuir quantidade"
            disabled={qtd <= 1}
            onClick={() => onChangeQtd(Math.max(1, qtd - 1))}
          >
            <Minus size={16} strokeWidth={2.5} />
          </button>
          <span
            className="min-w-6 text-center text-subtitle-md text-on-surface"
            aria-live="polite"
          >
            {qtd}
          </span>
          <button
            type="button"
            className="flex size-12 items-center justify-center text-primary"
            aria-label="Aumentar quantidade"
            onClick={() => onChangeQtd(qtd + 1)}
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      ) : null}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
