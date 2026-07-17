import { useEffect, type ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { lockAppScroll, unlockAppScroll } from '../../lib/scrollLock';
import { Button } from './Button';
import { useAnimatedPresence } from './useAnimatedPresence';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { mounted, exiting, onExitAnimationEnd } = useAnimatedPresence(open);

  useEffect(() => {
    if (!mounted || exiting) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loading) {
        onCancel();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    lockAppScroll();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      unlockAppScroll();
    };
  }, [mounted, exiting, loading, onCancel]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <button
        type="button"
        aria-label="Fechar"
        className={cn(
          'absolute inset-0 bg-operator-bg/80',
          exiting ? 'overlay-exit' : 'overlay-enter',
        )}
        disabled={loading || exiting}
        onClick={loading || exiting ? undefined : onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className={cn(
          'relative z-10 w-full max-w-sm rounded-xl border border-operator-border',
          'bg-operator-card p-5 shadow-card',
          exiting ? 'dialog-exit' : 'dialog-enter',
        )}
        onAnimationEnd={onExitAnimationEnd}
      >
        <h2
          id="confirm-dialog-title"
          className="text-title-md font-semibold text-on-surface"
        >
          {title}
        </h2>
        {description ? (
          <div className="mt-2 text-body-md text-on-surface-variant">
            {description}
          </div>
        ) : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            type="button"
            variant={variant}
            fullWidth
            disabled={loading || exiting}
            onClick={onConfirm}
          >
            {loading ? 'Aguarde…' : confirmLabel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled={loading || exiting}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
