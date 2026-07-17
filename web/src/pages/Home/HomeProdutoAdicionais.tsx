import { Minus, Plus } from 'lucide-react';

import { cn } from '../../lib/cn';
import { formatarMoeda } from '../../lib/currency';

export type AdicionalDraft = {
  id: string;
  nome: string;
  preco: number;
  qtd: number;
};

type AdicionalDisponivel = {
  id: string;
  nome: string;
  preco: string | number;
  ativo?: boolean;
};

type HomeProdutoAdicionaisProps = {
  disponiveis: AdicionalDisponivel[];
  selecionados: AdicionalDraft[];
  onAdd: (adicional: AdicionalDisponivel) => void;
  onChangeQtd: (id: string, qtd: number) => void;
};

export function HomeProdutoAdicionais({
  disponiveis,
  selecionados,
  onAdd,
  onChangeQtd,
}: HomeProdutoAdicionaisProps) {
  if (disponiveis.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <p className="text-subtitle-md text-on-surface">Adicionais</p>
        <p className="text-caption text-on-surface-variant">
          Escolha quantos quiser
        </p>
      </div>

      <ul className="overflow-hidden rounded-xl border border-operator-border bg-operator-card">
        {disponiveis.map((adicional, index) => {
          const draft = selecionados.find((item) => item.id === adicional.id);
          const preco = Number(adicional.preco);
          const indisponivel = adicional.ativo === false;

          return (
            <li
              key={adicional.id}
              className={cn(
                index > 0 ? 'border-t border-operator-border' : undefined,
                indisponivel && 'opacity-50',
              )}
            >
              <div className="flex min-h-14 items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-md text-on-surface">
                    {adicional.nome}
                  </p>
                  {indisponivel ? (
                    <p className="text-caption text-danger">Fora de estoque</p>
                  ) : (
                    <p className="text-caption text-on-surface-variant">
                      + {formatarMoeda(preco)}
                    </p>
                  )}
                </div>

                {indisponivel ? null : draft ? (
                  <div className="flex shrink-0 items-center gap-1 rounded-full border border-primary-container/40 bg-primary-container/10 px-1">
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 active:scale-95"
                      aria-label={`Diminuir ${adicional.nome}`}
                      onClick={() => onChangeQtd(adicional.id, draft.qtd - 1)}
                    >
                      <Minus size={16} strokeWidth={2.5} />
                    </button>
                    <span className="min-w-5 text-center text-subtitle-md text-on-surface">
                      {draft.qtd}
                    </span>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 active:scale-95"
                      aria-label={`Aumentar ${adicional.nome}`}
                      onClick={() => onChangeQtd(adicional.id, draft.qtd + 1)}
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary-container text-primary transition-colors hover:bg-primary/10 active:scale-95"
                    aria-label={`Adicionar ${adicional.nome}`}
                    onClick={() => onAdd(adicional)}
                  >
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
