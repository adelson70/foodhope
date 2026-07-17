import { CheckCircle2, X, XCircle } from 'lucide-react';

import { cn } from '../../lib/cn';
import { useToastStore } from '../../stores/toast.store';

export function Toaster() {
  const items = useToastStore((state) => state.items);
  const dismiss = useToastStore((state) => state.dismiss);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 pb-[env(safe-area-inset-bottom)]"
      aria-live="polite"
    >
      {items.map((item) => {
        const isSuccess = item.tone === 'success';

        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              'toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-card',
              isSuccess
                ? 'border-success/30 bg-operator-card text-on-surface'
                : 'border-danger/30 bg-operator-card text-on-surface',
            )}
          >
            {isSuccess ? (
              <CheckCircle2
                className="mt-0.5 shrink-0 text-success"
                size={20}
                strokeWidth={1.75}
              />
            ) : (
              <XCircle
                className="mt-0.5 shrink-0 text-danger"
                size={20}
                strokeWidth={1.75}
              />
            )}
            <p className="flex-1 text-caption text-on-surface">{item.message}</p>
            <button
              type="button"
              aria-label="Fechar aviso"
              className="shrink-0 text-on-surface-variant hover:text-on-surface transition-colors"
              onClick={() => dismiss(item.id)}
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
