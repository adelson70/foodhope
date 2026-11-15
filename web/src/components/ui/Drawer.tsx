import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type PointerEvent,
  type ReactNode,
} from 'react';
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
   * `dialog`: `sheet` no celular e modal centralizado no desktop (lg).
   */
  variant?: 'full' | 'sheet' | 'dialog';
};

const DESKTOP_QUERY = '(min-width: 1024px)';

function assinarDesktop(onChange: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function useDesktop(): boolean {
  return useSyncExternalStore(
    assinarDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

// Drawers abertos, do mais antigo ao mais recente: o Esc fecha só o de cima.
const drawersAbertos: symbol[] = [];

// Arrastar o drawer de baixo: fecha se passar desta fração da altura ou se o
// gesto for rápido (px/ms).
const FECHAR_FRACAO = 0.3;
const FECHAR_VELOCIDADE = 0.6;
const VOLTAR_TRANSICAO = 'transform 240ms cubic-bezier(0.32, 0.72, 0, 1)';

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
  const panelRef = useRef<HTMLDivElement>(null);
  const arrastoRef = useRef<{ id: number; y: number; t: number } | null>(null);
  useScrollFocusedIntoView(bodyRef);
  const titleId = useId();
  const desktop = useDesktop();
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

  const modal = variant === 'dialog' && desktop;
  const sheet = variant === 'sheet' || (variant === 'dialog' && !desktop);

  function iniciarArrasto(event: PointerEvent<HTMLDivElement>) {
    if (!sheet || exiting || !panelRef.current) return;
    if ((event.target as HTMLElement).closest('button')) return;
    arrastoRef.current = {
      id: event.pointerId,
      y: event.clientY,
      t: event.timeStamp,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    panelRef.current.style.transition = 'none';
  }

  function moverArrasto(event: PointerEvent<HTMLDivElement>) {
    const arrasto = arrastoRef.current;
    const panel = panelRef.current;
    if (!arrasto || arrasto.id !== event.pointerId || !panel) return;
    const dy = Math.max(0, event.clientY - arrasto.y);
    panel.style.transform = dy > 0 ? `translateY(${dy}px)` : '';
  }

  function soltarArrasto(event: PointerEvent<HTMLDivElement>) {
    const arrasto = arrastoRef.current;
    const panel = panelRef.current;
    if (!arrasto || arrasto.id !== event.pointerId || !panel) return;
    arrastoRef.current = null;
    const dy = Math.max(0, event.clientY - arrasto.y);
    const velocidade = dy / Math.max(1, event.timeStamp - arrasto.t);
    if (
      dy > panel.offsetHeight * FECHAR_FRACAO ||
      (dy > 10 && velocidade > FECHAR_VELOCIDADE)
    ) {
      // A animação de saída parte da posição atual do arrasto.
      onClose();
      return;
    }
    panel.style.transition = VOLTAR_TRANSICAO;
    panel.style.transform = '';
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center overflow-hidden',
        modal ? 'items-center p-4' : sheet ? 'items-end' : 'lg:justify-end',
      )}
    >
      <button
        type="button"
        aria-label="Fechar drawer"
        className={cn(
          'absolute inset-0',
          sheet || modal ? 'bg-black/45' : 'bg-operator-bg/80',
          sheet || modal
            ? exiting
              ? 'sheet-overlay-exit'
              : 'sheet-overlay-enter'
            : exiting
              ? 'overlay-exit'
              : 'overlay-enter',
        )}
        disabled={exiting}
        onClick={exiting ? undefined : onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative z-10 flex w-full max-w-md flex-col',
          'bg-operator-surface border-x border-operator-border shadow-card',
          modal
            ? 'max-h-[85dvh] rounded-2xl border'
            : sheet
              ? 'max-h-[90dvh] rounded-t-2xl border-t'
              : 'h-dvh pt-[env(safe-area-inset-top)]',
          modal
            ? exiting
              ? 'dialog-exit'
              : 'dialog-enter'
            : sheet
              ? exiting
                ? 'sheet-exit'
                : 'sheet-enter'
              : exiting
                ? 'drawer-exit'
                : 'drawer-enter',
        )}
        onAnimationEnd={onExitAnimationEnd}
      >
        <header
          className={cn(
            'shrink-0 border-b border-operator-border',
            sheet &&
              'cursor-grab touch-none select-none active:cursor-grabbing',
          )}
          onPointerDown={iniciarArrasto}
          onPointerMove={moverArrasto}
          onPointerUp={soltarArrasto}
          onPointerCancel={soltarArrasto}
        >
          {sheet ? (
            <div
              aria-hidden
              className="mx-auto mt-2 h-1 w-10 rounded-full bg-outline-variant"
            />
          ) : null}
          <div
            className={cn(
              'flex items-center justify-between gap-3 px-4',
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
          </div>
        </header>
        <div
          ref={bodyRef}
          className={cn(
            'min-h-0 overflow-y-auto overscroll-y-contain px-4 py-4',
            sheet || modal ? 'shrink' : 'flex-1',
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
