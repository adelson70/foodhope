import { isNetworkFailure, isOfflineNow } from './network';
import {
  enfileirarPedidoOutbox,
  type PedidoOutboxOrigem,
  type PedidoOutboxSnapshot,
} from './pedidoOutbox';
import { getApiErrorMensagens } from '../services/api';
import { notifyError, notifySuccess } from '../services/notify';
import { pedidoService } from '../services/pedido.service';
import type {
  ApiResponse,
  CriarPedidoDados,
  CriarPedidoInput,
  Pedido,
} from '../services/types';

export type CriarPedidoComOutboxResult =
  | { kind: 'created'; pedido: Pedido; response: ApiResponse<CriarPedidoDados> }
  | { kind: 'queued'; clientRequestId: string };

export type CriarPedidoComOutboxOptions = {
  origem: PedidoOutboxOrigem;
  snapshot: PedidoOutboxSnapshot;
  silentSuccess?: boolean;
  clientRequestId?: string;
};

function novoClientRequestId(): string {
  return crypto.randomUUID();
}

export async function criarPedidoComOutbox(
  input: CriarPedidoInput,
  options: CriarPedidoComOutboxOptions,
): Promise<CriarPedidoComOutboxResult> {
  const clientRequestId =
    options.clientRequestId ??
    input.client_request_id ??
    novoClientRequestId();

  const payload: CriarPedidoInput = {
    ...input,
    client_request_id: clientRequestId,
  };

  if (isOfflineNow()) {
    await enfileirarPedidoOutbox({
      clientRequestId,
      payload,
      origem: options.origem,
      snapshot: options.snapshot,
    });
    notifySuccess(
      null,
      'Pedido salvo localmente; será enviado ao reconectar',
    );
    return { kind: 'queued', clientRequestId };
  }

  try {
    const response = await pedidoService.criarRaw(payload);

    if (!response.sucesso || !response.dados?.pedido) {
      notifyError(
        response.mensagens,
        'Não foi possível criar o pedido',
      );
      const erro = Object.assign(
        new Error(
          response.mensagens.find((item) => item.trim().length > 0) ??
            'Não foi possível criar o pedido',
        ),
        { __toastNotified: true as const },
      );
      throw erro;
    }

    if (!options.silentSuccess) {
      notifySuccess(response.mensagens, 'Pedido criado com sucesso');
    }

    return {
      kind: 'created',
      pedido: response.dados.pedido,
      response,
    };
  } catch (error) {
    if (isNetworkFailure(error)) {
      await enfileirarPedidoOutbox({
        clientRequestId,
        payload,
        origem: options.origem,
        snapshot: options.snapshot,
      });
      notifySuccess(
        null,
        'Pedido salvo localmente; será enviado ao reconectar',
      );
      return { kind: 'queued', clientRequestId };
    }

    if (
      error &&
      typeof error === 'object' &&
      '__toastNotified' in error &&
      (error as { __toastNotified?: boolean }).__toastNotified
    ) {
      throw error;
    }

    notifyError(
      getApiErrorMensagens(error),
      'Não foi possível criar o pedido',
    );
    throw error;
  }
}

export async function sincronizarPedidoOutboxItem(item: {
  clientRequestId: string;
  payload: CriarPedidoInput;
}): Promise<Pedido> {
  const response = await pedidoService.criarRaw({
    ...item.payload,
    client_request_id: item.clientRequestId,
  });

  if (!response.sucesso || !response.dados?.pedido) {
    const mensagem =
      response.mensagens.find((m) => m.trim().length > 0) ??
      'Não foi possível sincronizar o pedido';
    throw Object.assign(new Error(mensagem), {
      validation: true,
      mensagens: response.mensagens,
    });
  }

  return response.dados.pedido;
}

export function mensagensErroValidacao(error: unknown): string[] {
  return getApiErrorMensagens(error);
}

export function notificarFalhaSync(error: unknown) {
  notifyError(mensagensErroValidacao(error), 'Falha ao sincronizar pedido');
}
