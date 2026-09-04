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

      if (socket.connected) {
        socket.disconnect();
      }

      socket.connect();
    });

  return connectChain;
}

export const disconnectSocket = () => {
  socket.disconnect();
};
