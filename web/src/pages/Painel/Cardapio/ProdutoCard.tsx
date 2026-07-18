import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui';
import type { Produto } from '../../../services/types';
import { formatarMoeda } from './produtoFormat';

type ProdutoCardProps = {
  produto: Produto;
  busy?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: (produto: Produto) => void;
  onMoveDown?: (produto: Produto) => void;
  onEdit: (produto: Produto) => void;
  onDelete: (produto: Produto) => void;
};

export function ProdutoCard({
  produto,
  busy,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: ProdutoCardProps) {
  const mostrarOrdem = Boolean(onMoveUp && onMoveDown);

  return (
    <article className="rounded-xl border border-operator-border bg-operator-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-subtitle-md font-medium text-on-surface">
            {produto.nome}
          </h2>
          {produto.descricao ? (
            <p className="mt-1 line-clamp-2 text-caption text-on-surface-variant">
              {produto.descricao}
            </p>
          ) : null}
          <p className="mt-2 text-body-md font-medium text-on-surface">
            {formatarMoeda(Number(produto.preco))}
          </p>
        </div>
        {mostrarOrdem && (canMoveUp || canMoveDown) ? (
          <div className="flex shrink-0 gap-1">
            {canMoveUp ? (
              <Button
                type="button"
                variant="ghost"
                className="size-10 px-0"
                disabled={busy}
                aria-label={`Subir ${produto.nome}`}
                onClick={() => onMoveUp?.(produto)}
              >
                <ArrowUp size={15} strokeWidth={1.75} />
              </Button>
            ) : null}
            {canMoveDown ? (
              <Button
                type="button"
                variant="ghost"
                className="size-10 px-0"
                disabled={busy}
                aria-label={`Descer ${produto.nome}`}
                onClick={() => onMoveDown?.(produto)}
              >
                <ArrowDown size={15} strokeWidth={1.75} />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="ghost"
          className="h-9 flex-1 px-3"
          disabled={busy}
          aria-label={`Editar ${produto.nome}`}
          onClick={() => onEdit(produto)}
        >
          <Pencil size={15} strokeWidth={1.75} />
          Editar
        </Button>
        <Button
          type="button"
          variant="dangerGhost"
          className="h-9 flex-1 px-3"
          disabled={busy}
          aria-label={`Excluir ${produto.nome}`}
          onClick={() => onDelete(produto)}
        >
          <Trash2 size={15} strokeWidth={1.75} />
          Excluir
        </Button>
      </div>
    </article>
  );
}
