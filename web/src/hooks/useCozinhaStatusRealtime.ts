import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { notifyError, notifySuccess } from '../services/notify';
import { socket } from '../services/socket';
import { COZINHA_STATUS_KEY } from './useCozinhaStatus';

type CozinhaStatusEvento = {
  ativa: boolean;
};

function deveAvisarUsuario(): boolean {
  const path = window.location.pathname;
  if (path.startsWith('/painel') || path.startsWith('/login')) {
    return false;
  }
  return true;
}

export function useCozinhaStatusRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    function onStatus(payload: CozinhaStatusEvento) {
      if (typeof payload?.ativa !== 'boolean') return;

      const atual = queryClient.getQueryData<{ ativa: boolean }>(
        COZINHA_STATUS_KEY,
      );
      if (atual?.ativa === payload.ativa) return;

      queryClient.setQueryData(COZINHA_STATUS_KEY, { ativa: payload.ativa });

      if (!deveAvisarUsuario()) return;

      if (payload.ativa) {
        notifySuccess(['Loja aberta'], 'Loja aberta');
      } else {
        notifyError(['Loja fechada'], 'Loja fechada');
      }
    }

    socket.on('cozinha:status', onStatus);
    return () => {
      socket.off('cozinha:status', onStatus);
    };
  }, [queryClient]);
}
