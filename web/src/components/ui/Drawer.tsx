import { useEffect, useRef, type ReactNode } from 'react';
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
};

export function Drawer({ open, title, onClose, children, footer }: DrawerProps) {
  const { mounted, exiting, onExitAnimationEnd } = useAnimatedPresence(open);
  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollFocusedIntoView(bodyRef);

  useEffect(() => {
    if (!mounted || exiting) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    lockAppScroll();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      unlockAppScroll();
    };
  }, [mounted, exiting, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-hidden">
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
        aria-labelledby="drawer-title"
        className={cn(
          'relative z-10 flex h-dvh w-full max-w-md flex-col',
          'bg-operator-surface border-x border-operator-border shadow-card',
          'pt-[env(safe-area-inset-top)]',
          exiting ? 'drawer-exit' : 'drawer-enter',
        )}
        onAnimationEnd={onExitAnimationEnd}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-operator-border px-4 py-4">
          <h2
            id="drawer-title"
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
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4"
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
