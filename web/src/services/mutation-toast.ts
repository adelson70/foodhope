import axios from 'axios';

import { notifyError, notifyMessages } from './notify';
import type { ApiErrorBody, ApiResponse } from './types';

type MutationToastFallbacks = {
  success?: string | false;
  error?: string | false;
};

type ToastNotifiedError = Error & { __toastNotified?: true };

export async function withMutationToast<T>(
  action: () => Promise<ApiResponse<T>>,
  fallbacks: MutationToastFallbacks = {},
): Promise<ApiResponse<T>> {
  try {
    const response = await action();

    if (!response.sucesso) {
      if (fallbacks.error !== false) {
        notifyMessages(
          'error',
          response.mensagens,
          fallbacks.error ?? 'Não foi possível concluir a operação.',
        );
      }

      const error: ToastNotifiedError = new Error(
        response.mensagens.find((item) => item.trim().length > 0) ??
          (typeof fallbacks.error === 'string'
            ? fallbacks.error
            : undefined) ??
          'Não foi possível concluir a operação.',
      );
      error.__toastNotified = true;
      throw error;
    }

    if (fallbacks.success !== false) {
      notifyMessages(
        'success',
        response.mensagens,
        fallbacks.success ?? 'Operação realizada com sucesso',
      );
    }

    return response;
  } catch (error) {
    if ((error as ToastNotifiedError).__toastNotified) {
      throw error;
    }

    if (fallbacks.error !== false) {
      if (axios.isAxiosError<ApiErrorBody>(error)) {
        notifyError(
          error.response?.data?.mensagens,
          fallbacks.error ?? 'Não foi possível concluir a operação.',
        );
      } else {
        notifyError(
          null,
          fallbacks.error ?? 'Não foi possível concluir a operação.',
        );
      }
    }

    throw error;
  }
}
