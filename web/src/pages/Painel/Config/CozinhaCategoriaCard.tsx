import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui';
import type { Categoria } from '../../../services/types';

type CozinhaCategoriaCardProps = {
  categoria: Categoria;
  busy?: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: (categoria: Categoria) => void;
  onMoveDown: (categoria: Categoria) => void;
  onEdit: (categoria: Categoria) => void;
  onDelete: (categoria: Categoria) => void;
};

export function CozinhaCategoriaCard({
  categoria,
  busy,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: CozinhaCategoriaCardProps) {
  return (
    <li className="rounded-xl border border-operator-border bg-operator-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-body-md font-medium text-on-surface">
            {categoria.nome}
          </p>
          <p className="text-caption text-on-surface-variant">
            Ordem {categoria.ordem + 1}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {!isFirst ? (
            <Button
              type="button"
              variant="ghost"
              className="size-10 px-0"
              disabled={busy}
              aria-label={`Subir ${categoria.nome}`}
              onClick={() => onMoveUp(categoria)}
            >
              <ArrowUp size={15} strokeWidth={1.75} />
            </Button>
          ) : null}
          {!isLast ? (
            <Button
              type="button"
              variant="ghost"
              className="size-10 px-0"
              disabled={busy}
              aria-label={`Descer ${categoria.nome}`}
              onClick={() => onMoveDown(categoria)}
            >
              <ArrowDown size={15} strokeWidth={1.75} />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="ghost"
          className="h-9 flex-1 px-3"
          disabled={busy}
          onClick={() => onEdit(categoria)}
        >
          <Pencil size={13} strokeWidth={1.75} />
          Editar
        </Button>
        <Button
          type="button"
          variant="dangerGhost"
          className="h-9 flex-1 px-3"
          disabled={busy}
          onClick={() => onDelete(categoria)}
        >
          <Trash2 size={13} strokeWidth={1.75} />
          Excluir
        </Button>
      </div>
    </li>
  );
}
