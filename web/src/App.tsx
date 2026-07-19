import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from './components/ui/Toaster';
import { useCardapioCarrinhoRealtime } from './hooks/useCardapioCarrinhoRealtime';
import { router } from './routes';
import { persistOptions, queryClient } from './services/queryClient';
import { clearToken } from './services/cookie';
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

    function onLogoutForcado() {
      clearToken();
      window.location.assign('/login');
    }

    socket.on('sessao:logout', onLogoutForcado);

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('sessao:logout', onLogoutForcado);
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
