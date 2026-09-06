import {
  idbDelete,
  idbGet,
  idbGetAll,
  idbPut,
  STORE_PEDIDO_OUTBOX,
} from './clientIdb';
import type { CriarPedidoInput, Pedido } from '../services/types';

export type PedidoOutboxOrigem = 'painel' | 'totem';
export type PedidoOutboxStatus = 'pending' | 'syncing' | 'failed';

export type PedidoOutboxSnapshotItem = {
  nome: string;
  qtd: number;
};

export type PedidoOutboxSnapshot = {
  nome_completo: string;
  tipo_consumo?: CriarPedidoInput['tipo_consumo'];
  status_pagamento?: CriarPedidoInput['status_pagamento'];
  itens: PedidoOutboxSnapshotItem[];
  totalEstimado?: number;
};

export type PedidoOutboxItem = {
  clientRequestId: string;
  payload: CriarPedidoInput;
  origem: PedidoOutboxOrigem;
  status: PedidoOutboxStatus;
  createdAtLocal: string;
  tentativas: number;
  lastError?: string;
  snapshot: PedidoOutboxSnapshot;
};

export const PEDIDO_OUTBOX_CHANGED_EVENT = 'foodhope:pedido-outbox';
export const PEDIDO_OUTBOX_SYNCED_EVENT = 'foodhope:pedido-outbox-synced';

function emitOutboxChanged() {
  window.dispatchEvent(new CustomEvent(PEDIDO_OUTBOX_CHANGED_EVENT));
}

export function emitOutboxSynced(detail: {
  clientRequestId: string;
  pedido: Pedido;
  origem: PedidoOutboxOrigem;
}) {
  window.dispatchEvent(
    new CustomEvent(PEDIDO_OUTBOX_SYNCED_EVENT, { detail }),
  );
}

export async function listarPedidoOutbox(): Promise<PedidoOutboxItem[]> {
  const items = await idbGetAll<PedidoOutboxItem>(STORE_PEDIDO_OUTBOX);
  return items.sort((a, b) =>
    a.createdAtLocal.localeCompare(b.createdAtLocal),
  );
}

export async function obterPedidoOutbox(
  clientRequestId: string,
): Promise<PedidoOutboxItem | undefined> {
  return idbGet<PedidoOutboxItem>(STORE_PEDIDO_OUTBOX, clientRequestId);
}

export async function enfileirarPedidoOutbox(input: {
  clientRequestId: string;
  payload: CriarPedidoInput;
  origem: PedidoOutboxOrigem;
  snapshot: PedidoOutboxSnapshot;
}): Promise<PedidoOutboxItem> {
  const item: PedidoOutboxItem = {
    clientRequestId: input.clientRequestId,
    payload: {
      ...input.payload,
      client_request_id: input.clientRequestId,
    },
    origem: input.origem,
    status: 'pending',
    createdAtLocal: new Date().toISOString(),
    tentativas: 0,
    snapshot: input.snapshot,
  };

  await idbPut(STORE_PEDIDO_OUTBOX, item.clientRequestId, item);
  emitOutboxChanged();
  return item;
}

export async function atualizarPedidoOutbox(
  item: PedidoOutboxItem,
): Promise<void> {
  await idbPut(STORE_PEDIDO_OUTBOX, item.clientRequestId, item);
  emitOutboxChanged();
}

export async function removerPedidoOutbox(
  clientRequestId: string,
): Promise<void> {
  await idbDelete(STORE_PEDIDO_OUTBOX, clientRequestId);
  emitOutboxChanged();
}

export function outboxParaPedidoLocal(item: PedidoOutboxItem): Pedido {
  return {
    id: `local:${item.clientRequestId}`,
    numero: '—',
    nome_completo: item.snapshot.nome_completo,
    tipo_consumo: item.snapshot.tipo_consumo,
    status_pagamento: item.snapshot.status_pagamento ?? 'NAO_PAGO',
    pronto: false,
    prontoAt: null,
    pendingSync: item.status !== 'failed',
    syncFailed: item.status === 'failed',
    syncError: item.lastError,
    clientRequestId: item.clientRequestId,
    totalEstimado: item.snapshot.totalEstimado,
    createdAt: item.createdAtLocal,
    itens: item.snapshot.itens.map((linha, index) => ({
      id: `${item.clientRequestId}:${index}`,
      pedido_id: `local:${item.clientRequestId}`,
      produto_id: '',
      quantidade: linha.qtd,
      preco_produto: 0,
      adicional_venda: [],
      observacao: null,
      produto: {
        id: '',
        nome: linha.nome,
        descricao: null,
        preco: 0,
        imagemUrl: null,
      },
    })),
  };
}
