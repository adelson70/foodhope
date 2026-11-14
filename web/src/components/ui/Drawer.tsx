import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

import { useScrollFocusedIntoView } from '../../hooks/useScrollFocusedIntoView';
import { cn } from '../../lib/cn';
import { lockAppScroll, unlockAppScroll } from '../../lib/scrollLock';
import { useAnimatedPresence } from './useAnimatedPresence';

type DrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * `full` (padrão): tela toda no celular, à direita no desktop.
   * `sheet`: sobe de baixo com a altura do conteúdo (até 90% da tela).
   */
  variant?: 'full' | 'sheet';
};

// Drawers abertos, do mais antigo ao mais recente: o Esc fecha só o de cima.
const drawersAbertos: symbol[] = [];

export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
  variant = 'full',
}: DrawerProps) {
  const { mounted, exiting, onExitAnimationEnd } = useAnimatedPresence(open);
  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollFocusedIntoView(bodyRef);
  const titleId = useId();
  // Ref: o efeito não reinicia (e não muda a ordem da pilha) quando onClose muda.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!mounted || exiting) return;

    const token = Symbol('drawer');
    drawersAbertos.push(token);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (drawersAbertos[drawersAbertos.length - 1] !== token) return;
      onCloseRef.current();
    }

    document.addEventListener('keydown', onKeyDown);
    lockAppScroll();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      drawersAbertos.splice(drawersAbertos.indexOf(token), 1);
      unlockAppScroll();
    };
  }, [mounted, exiting]);

  if (!mounted) return null;

  const sheet = variant === 'sheet';

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center overflow-hidden',
        sheet ? 'items-end' : 'lg:justify-end',
      )}
    >
      <button
        type="button"
        aria-label="Fechar drawer"
        className={cn(
          'absolute inset-0 bg-operator-bg/80',
          exiting ? 'overlay-exit' : 'overlay-enter',
        )}
        disabled={exiting}
        onClick={exiting ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative z-10 flex w-full max-w-md flex-col',
          'bg-operator-surface border-x border-operator-border shadow-card',
          sheet
            ? 'max-h-[90dvh] rounded-t-2xl border-t'
            : 'h-dvh pt-[env(safe-area-inset-top)]',
          exiting ? 'drawer-exit' : 'drawer-enter',
        )}
        onAnimationEnd={onExitAnimationEnd}
      >
        {sheet ? (
          <div
            aria-hidden
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-outline-variant"
          />
        ) : null}
        <header
          className={cn(
            'flex shrink-0 items-center justify-between gap-3 border-b border-operator-border px-4',
            sheet ? 'py-2' : 'py-4',
          )}
        >
          <h2
            id={titleId}
            className="text-title-md font-semibold text-on-surface"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            disabled={exiting}
            className="flex size-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-on-surface/5 hover:text-on-surface disabled:opacity-50"
            onClick={onClose}
          >
            <X size={19} strokeWidth={1.75} />
          </button>
        </header>
        <div
          ref={bodyRef}
          className={cn(
            'min-h-0 overflow-y-auto overscroll-y-contain px-4 py-4',
            sheet ? 'shrink' : 'flex-1',
          )}
        >
          {children}
        </div>
        {footer ? (
          <footer className="shrink-0 border-t border-operator-border px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
