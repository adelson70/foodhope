import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from './components/ui/Toaster';
import { router } from './routes';
import { connectSocket, disconnectSocket, socket } from './services/socket';

function App() {
  useEffect(() => {
    connectSocket();

    socket.on('connect', () => {
      console.log('Socket conectado:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Erro no socket:', error.message);
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      disconnectSocket();
    };
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;