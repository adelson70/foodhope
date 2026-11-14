import { useId, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '../../../lib/cn';

type SecaoRecolhivelProps = {
  titulo: string;
  /** Texto curto ao lado do título (ex.: quantidade). */
  resumo?: string;
  aberto: boolean;
  onToggle: () => void;
  /** Ação à direita do cabeçalho (ex.: botão "Adicionar"). */
  acao?: ReactNode;
  children: ReactNode;
};

/** Seção do formulário com cabeçalho clicável e seta para expandir/recolher. */
export function SecaoRecolhivel({
  titulo,
  resumo,
  aberto,
  onToggle,
  acao,
  children,
}: SecaoRecolhivelProps) {
  const conteudoId = useId();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls={conteudoId}
          onClick={onToggle}
          className="-mx-1 flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 text-left"
        >
          <ChevronDown
            size={18}
            strokeWidth={1.75}
            className={cn(
              'shrink-0 text-on-surface-variant transition-transform',
              !aberto && '-rotate-90',
            )}
          />
          <span className="text-label-sm tracking-widest text-on-surface-variant uppercase">
            {titulo}
          </span>
          {resumo ? (
            <span className="text-caption text-on-surface-variant">
              · {resumo}
            </span>
          ) : null}
        </button>
        {acao}
      </div>

      {aberto ? <div id={conteudoId}>{children}</div> : null}
    </div>
  );
}
