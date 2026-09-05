import { io, type Socket } from 'socket.io-client';

import { getToken } from './cookie';
import { signSocketAuth } from './visitor';

export const TELA_PEDIDOS_PRONTOS = 'pedidos-prontos';

export type ConnectSocketOptions = {
  tela?: typeof TELA_PEDIDOS_PRONTOS;
  label?: string;
  monitorHash?: string;
};

export const socket: Socket = io(import.meta.env.VITE_API_URL, {
  autoConnect: false,
});

let connectChain: Promise<void> = Promise.resolve();

export function isTelaPedidosPublicaPath(
  pathname: string = window.location.pathname,
) {
  return /^\/painel\/tela-pedidos\/[a-fA-F0-9]{64}\/?$/.test(pathname);
}

function waitDisconnect(s: Socket): Promise<void> {
  if (!s.connected && !s.active) return Promise.resolve();

  if (!s.connected) {
    s.disconnect();
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    s.once('disconnect', () => resolve());
    s.disconnect();
  });
}

function waitConnect(s: Socket): Promise<void> {
  if (s.connected) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const onConnect = () => {
      cleanup();
      resolve();
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onDisconnect = () => {
      cleanup();
      reject(new Error('Socket desconectado durante conexão'));
    };
    const cleanup = () => {
      s.off('connect', onConnect);
      s.off('connect_error', onError);
      s.off('disconnect', onDisconnect);
    };

    s.once('connect', onConnect);
    s.once('connect_error', onError);
    s.once('disconnect', onDisconnect);
    s.connect();
  });
}

export function connectSocket(
  options: ConnectSocketOptions = {},
): Promise<void> {
  connectChain = connectChain
    .catch(() => undefined)
    .then(async () => {
      if (options.monitorHash && options.tela) {
        socket.auth = {
          monitorHash: options.monitorHash,
          tela: options.tela,
          ...(options.label ? { label: options.label } : {}),
        };
      } else {
        const token = getToken();

        if (token) {
          socket.auth = {
            token,
            ...(options.tela
              ? {
                  tela: options.tela,
                  ...(options.label ? { label: options.label } : {}),
                }
              : {}),
          };
        } else {
          socket.auth = await signSocketAuth(import.meta.env.VITE_API_URL);
        }
      }

      await waitDisconnect(socket);
      await waitConnect(socket);
    });

  return connectChain;
}

export function disconnectSocket(): Promise<void> {
  connectChain = connectChain
    .catch(() => undefined)
    .then(async () => {
      await waitDisconnect(socket);
    });

  return connectChain;
}
