import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { InstalarAppPrompt } from './components/pwa/InstalarAppPrompt';
import { Toaster } from './components/ui/Toaster';
import { useCardapioCarrinhoRealtime } from './hooks/useCardapioCarrinhoRealtime';
import { useCozinhaStatusRealtime } from './hooks/useCozinhaStatusRealtime';
import { usePedidoProntoRealtime } from './hooks/usePedidoProntoRealtime';
import { marcarSeRotaEquipe } from './lib/dispositivoEquipe';
import { limparSessaoOperador } from './lib/sessaoOperador';
import { router } from './routes';
import { persistOptions, queryClient } from './services/queryClient';
import { clearToken } from './services/cookie';
import {
  connectSocket,
  disconnectSocket,
  isTelaPedidosPublicaPath,
  socket,
} from './services/socket';

function AppRealtime() {
  useCardapioCarrinhoRealtime();
  usePedidoProntoRealtime();
  useCozinhaStatusRealtime();
  return null;
}

function App() {
  useEffect(() => {
    marcarSeRotaEquipe(window.location.pathname);
    return router.subscribe((state) => {
      marcarSeRotaEquipe(state.location.pathname);
    });
  }, []);

  useEffect(() => {
    if (!isTelaPedidosPublicaPath()) {
      void connectSocket();
    }

    socket.on('connect', () => {
      console.log('Socket conectado:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Erro no socket:', error.message);
    });

    function onLogoutForcado() {
      clearToken();
      void limparSessaoOperador();
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
      <InstalarAppPrompt />
    </PersistQueryClientProvider>
  );
}

export default App;
