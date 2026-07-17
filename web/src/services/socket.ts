import { io, type Socket } from 'socket.io-client';

import { getToken } from './cookie';

export const socket: Socket = io(import.meta.env.VITE_API_URL, {
  autoConnect: false,
});

export const connectSocket = () => {
  const token = getToken();

  if (token) {
    socket.auth = { token };
  }

  socket.connect();
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
