import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from './components/ui/Toaster';
import { useCardapioCarrinhoRealtime } from './hooks/useCardapioCarrinhoRealtime';
import { router } from './routes';
import { persistOptions, queryClient } from './services/queryClient';
import { connectSocket, disconnectSocket, socket } from './services/socket';

function AppRealtime() {
  useCardapioCarrinhoRealtime();
  return null;
}

function App() {
  useEffect(() => {
    void connectSocket();

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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      <AppRealtime />
      <RouterProvider router={router} />
      <Toaster />
    </PersistQueryClientProvider>
  );
}

export default App;
