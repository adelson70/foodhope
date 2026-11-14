import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Trash2 } from 'lucide-react';

import { Button, Drawer } from '../../../components/ui';
import { cn } from '../../../lib/cn';

type ItemEditorDrawerProps = {
  open: boolean;
  titulo: string;
  onClose: () => void;
  onRemover?: () => void;
  removerLabel?: string;
  disabled?: boolean;
  children: ReactNode;
};

/**
 * Painel lateral para editar um item de lista do formulário do produto
 * (variação, adicional, ingrediente). Fica num portal no body porque o drawer
 * do produto tem transform, o que quebraria o `position: fixed` aninhado.
 */
export function ItemEditorDrawer({
  open,
  titulo,
  onClose,
  onRemover,
  removerLabel = 'Remover',
  disabled = false,
  children,
}: ItemEditorDrawerProps) {
  return createPortal(
    <Drawer
      open={open}
      title={titulo}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {onRemover ? (
            <Button
              type="button"
              variant="dangerGhost"
              className="size-12 shrink-0 px-0 py-0"
              aria-label={removerLabel}
              disabled={disabled}
              onClick={onRemover}
            >
              <Trash2 size={17} strokeWidth={1.75} />
            </Button>
          ) : null}
          <Button type="button" fullWidth disabled={disabled} onClick={onClose}>
            Concluir
          </Button>
        </div>
      }
    >
      {children}
    </Drawer>,
    document.body,
  );
}

type ItemLinhaProps = {
  titulo: string | undefined;
  detalhe?: string;
  erro?: boolean;
  inicio?: ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

/** Linha compacta da lista; tocar abre o painel de edição. */
export function ItemLinha({
  titulo,
  detalhe,
  erro = false,
  inicio,
  disabled = false,
  onClick,
}: ItemLinhaProps) {
  const nome = titulo?.trim();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex min-h-12 w-full items-center gap-3 rounded-xl border bg-operator-bg px-3 py-2 text-left transition-colors hover:bg-on-surface/5',
        erro ? 'border-danger' : 'border-operator-border',
        inicio && 'pl-2',
      )}
    >
      {inicio}
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-body-md',
            nome ? 'text-on-surface' : 'text-on-surface-variant italic',
          )}
        >
          {nome || 'Sem nome'}
        </span>
        {detalhe ? (
          <span className="block text-caption text-on-surface-variant">
            {detalhe}
          </span>
        ) : null}
        {erro ? (
          <span className="block text-caption text-danger">
            Toque para corrigir
          </span>
        ) : null}
      </div>
      <ChevronRight
        size={18}
        strokeWidth={1.75}
        className="shrink-0 text-on-surface-variant"
      />
    </button>
  );
}
