import { io, type Socket } from 'socket.io-client';

import { getToken } from './cookie';
import { signSocketAuth } from './visitor';

export const socket: Socket = io(import.meta.env.VITE_API_URL, {
  autoConnect: false,
});

let connectPromise: Promise<void> | null = null;

export async function connectSocket(): Promise<void> {
  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    const token = getToken();

    if (token) {
      socket.auth = { token };
    } else {
      const auth = await signSocketAuth(import.meta.env.VITE_API_URL);
      socket.auth = auth;
    }

    if (!socket.connected) {
      socket.connect();
    }
  })().finally(() => {
    connectPromise = null;
  });

  return connectPromise;
}

export const disconnectSocket = () => {
  socket.disconnect();
};
