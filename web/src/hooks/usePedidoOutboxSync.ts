import { useCallback, useEffect, useRef, useState } from 'react';

import {
  mensagensErroValidacao,
  notificarFalhaSync,
  sincronizarPedidoOutboxItem,
} from '../lib/criarPedidoComOutbox';
import { getToken } from '../services/cookie';
import { isNetworkFailure, isOfflineNow } from '../lib/network';
import { notifySuccess } from '../services/notify';
import {
  atualizarPedidoOutbox,
  emitOutboxSynced,
  listarPedidoOutbox,
  PEDIDO_OUTBOX_CHANGED_EVENT,
  removerPedidoOutbox,
  type PedidoOutboxItem,
} from '../lib/pedidoOutbox';

export function useOnlineStatus() {
  const [online, setOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine,
  );

  useEffect(() => {
    function onOnline() {
      setOnline(true);
    }
    function onOffline() {
      setOnline(false);
    }
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return online;
}

export function usePedidoOutboxItems() {
  const [items, setItems] = useState<PedidoOutboxItem[]>([]);

  const refresh = useCallback(async () => {
    const lista = await listarPedidoOutbox();
    setItems(lista);
  }, []);

  useEffect(() => {
    void refresh();
    function onChange() {
      void refresh();
    }
    window.addEventListener(PEDIDO_OUTBOX_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener(PEDIDO_OUTBOX_CHANGED_EVENT, onChange);
    };
  }, [refresh]);

  return { items, refresh };
}

let syncLock: Promise<void> | null = null;

export async function flushPedidoOutbox(options: {
  notifySuccessToast?: boolean;
} = {}): Promise<void> {
  if (isOfflineNow() || !getToken()) return;

  if (syncLock) {
    await syncLock;
    return;
  }

  syncLock = (async () => {
    const pendentes = (await listarPedidoOutbox()).filter(
      (item) =>
        item.status === 'pending' ||
        item.status === 'failed' ||
        item.status === 'syncing',
    );

    for (const item of pendentes) {
      if (isOfflineNow() || !getToken()) break;

      const syncing: PedidoOutboxItem = {
        ...item,
        status: 'syncing',
        tentativas: item.tentativas + 1,
      };
      await atualizarPedidoOutbox(syncing);

      try {
        const pedido = await sincronizarPedidoOutboxItem(item);
        await removerPedidoOutbox(item.clientRequestId);
        emitOutboxSynced({
          clientRequestId: item.clientRequestId,
          pedido,
          origem: item.origem,
        });
        if (options.notifySuccessToast !== false) {
          notifySuccess(
            null,
            `Pedido #${pedido.numero} sincronizado`,
          );
        }
      } catch (error) {
        if (isNetworkFailure(error)) {
          await atualizarPedidoOutbox({
            ...syncing,
            status: 'pending',
            lastError: undefined,
          });
          break;
        }

        const mensagens = mensagensErroValidacao(error);
        await atualizarPedidoOutbox({
          ...syncing,
          status: 'failed',
          lastError: mensagens[0],
        });
        notificarFalhaSync(error);
      }
    }
  })();

  try {
    await syncLock;
  } finally {
    syncLock = null;
  }
}

export function usePedidoOutboxSync(enabled: boolean) {
  const online = useOnlineStatus();
  const runningRef = useRef(false);

  const run = useCallback(async () => {
    if (!enabled || runningRef.current) return;
    runningRef.current = true;
    try {
      await flushPedidoOutbox();
    } finally {
      runningRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void run();
  }, [enabled, online, run]);

  useEffect(() => {
    if (!enabled) return;

    function onChange() {
      void run();
    }
    function onFocus() {
      void run();
    }

    window.addEventListener(PEDIDO_OUTBOX_CHANGED_EVENT, onChange);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener(PEDIDO_OUTBOX_CHANGED_EVENT, onChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, run]);
}
