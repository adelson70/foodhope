import { useToastStore, type ToastTone } from '../stores/toast.store';

function normalizeMensagens(
  mensagens: string[] | undefined | null,
  fallback: string,
): string[] {
  const list = (mensagens ?? [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return list.length > 0 ? list : [fallback];
}

export function notifyMessages(
  tone: ToastTone,
  mensagens: string[] | undefined | null,
  fallback: string,
) {
  const { push } = useToastStore.getState();

  for (const message of normalizeMensagens(mensagens, fallback)) {
    push(tone, message);
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
