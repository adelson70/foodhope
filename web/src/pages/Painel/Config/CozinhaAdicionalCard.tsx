import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui';
import { formatarMoeda } from '../../../lib/currency';
import { cn } from '../../../lib/cn';
import type { AdicionalGlobal } from '../../../services/types';

type CozinhaAdicionalCardProps = {
  adicional: AdicionalGlobal;
  busy?: boolean;
  onToggleAtivo: (adicional: AdicionalGlobal) => void;
  onEdit: (adicional: AdicionalGlobal) => void;
  onDelete: (adicional: AdicionalGlobal) => void;
};

export function CozinhaAdicionalCard({
  adicional,
  busy,
  onToggleAtivo,
  onEdit,
  onDelete,
}: CozinhaAdicionalCardProps) {
  return (
    <li className="rounded-xl border border-operator-border bg-operator-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-body-md font-medium text-on-surface">
            {adicional.nome}
          </p>
          <p className="text-caption text-on-surface-variant">
            {formatarMoeda(Number(adicional.preco))}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={adicional.ativo}
          aria-label={
            adicional.ativo
              ? `Desativar ${adicional.nome}`
              : `Ativar ${adicional.nome}`
          }
          disabled={busy}
          onClick={() => onToggleAtivo(adicional)}
          className={cn(
            'relative h-8 w-14 shrink-0 rounded-full transition-colors',
            adicional.ativo ? 'bg-primary' : 'bg-outline-variant',
            busy && 'opacity-60',
          )}
        >
          <span
            className={cn(
              'absolute top-1 size-6 rounded-full bg-surface shadow-card transition-transform',
              adicional.ativo ? 'left-7' : 'left-1',
            )}
          />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="ghost"
          className="h-10 flex-1 px-3 text-caption"
          disabled={busy}
          onClick={() => onEdit(adicional)}
        >
          <Pencil size={16} strokeWidth={1.75} />
          Editar
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 flex-1 px-3 text-caption text-danger hover:bg-danger/10"
          disabled={busy}
          onClick={() => onDelete(adicional)}
        >
          <Trash2 size={16} strokeWidth={1.75} />
          Excluir
        </Button>
      </div>
    </li>
  );
}
