import { io, Socket } from 'socket.io-client';

export const socket: Socket = io(import.meta.env.VITE_API_URL, {
  autoConnect: false,
});

export const connectSocket = () => {
  const token = "";
  
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