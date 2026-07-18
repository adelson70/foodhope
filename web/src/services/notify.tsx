import { CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '../lib/cn';

export type ToastTone = 'success' | 'error';

function normalizeMensagens(
  mensagens: string[] | undefined | null,
  fallback: string,
): string[] {
  const list = (mensagens ?? [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return list.length > 0 ? list : [fallback];
}

function showToast(tone: ToastTone, message: string) {
  toast.custom(
    (id) => (
      <button
        type="button"
        onClick={() => toast.dismiss(id)}
        className={cn(
          'pointer-events-auto flex w-[min(100%,24rem)] cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-left shadow-card',
          'bg-operator-card text-on-surface transition-opacity hover:opacity-95',
          tone === 'success' ? 'border-success/30' : 'border-danger/30',
        )}
      >
        {tone === 'success' ? (
          <CheckCircle2
            className="mt-0.5 shrink-0 text-success"
            size={17}
            strokeWidth={1.75}
          />
        ) : (
          <XCircle
            className="mt-0.5 shrink-0 text-danger"
            size={17}
            strokeWidth={1.75}
          />
        )}
        <span className="flex-1 text-caption text-on-surface">{message}</span>
      </button>
    ),
    { duration: 4200 },
  );
}

export function notifyMessages(
  tone: ToastTone,
  mensagens: string[] | undefined | null,
  fallback: string,
) {
  for (const message of normalizeMensagens(mensagens, fallback)) {
    showToast(tone, message);
  }
}

export function notifySuccess(
  mensagens: string[] | undefined | null,
  fallback = 'Operação realizada com sucesso',
) {
  notifyMessages('success', mensagens, fallback);
}

export function notifyError(
  mensagens: string[] | undefined | null,
  fallback = 'Não foi possível concluir a operação.',
) {
  notifyMessages('error', mensagens, fallback);
}
