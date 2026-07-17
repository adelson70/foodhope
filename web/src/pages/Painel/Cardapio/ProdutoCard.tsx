import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui';
import type { Produto } from '../../../services/types';
import { formatarMoeda } from './produtoFormat';

type ProdutoCardProps = {
  produto: Produto;
  onEdit: (produto: Produto) => void;
  onDelete: (produto: Produto) => void;
};

export function ProdutoCard({ produto, onEdit, onDelete }: ProdutoCardProps) {
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
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            aria-label={`Editar ${produto.nome}`}
            className="size-10 px-0 py-0 text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface"
            onClick={() => onEdit(produto)}
          >
            <Pencil size={20} strokeWidth={1.75} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label={`Excluir ${produto.nome}`}
            className="size-10 px-0 py-0 text-danger hover:bg-danger/10"
            onClick={() => onDelete(produto)}
          >
            <Trash2 size={20} strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </article>
  );
}
