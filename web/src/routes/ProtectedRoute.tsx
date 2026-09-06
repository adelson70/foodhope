import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { Loading } from '../components/ui';
import { isNetworkFailure } from '../lib/network';
import {
  obterSessaoOperador,
  salvarSessaoOperador,
} from '../lib/sessaoOperador';
import { rotaInicialPorRole } from '../lib/rotaPorRole';
import { authService, getToken } from '../services';
import type { Operador, RoleOperador } from '../services/types';
import type { SessaoContext } from './sessao';

type GuardStatus = 'checking' | 'ok' | 'denied';

type ProtectedRouteProps = {
  allow?: RoleOperador[];
};

export function ProtectedRoute({ allow }: ProtectedRouteProps) {
  const [status, setStatus] = useState<GuardStatus>(() =>
    getToken() ? 'checking' : 'denied',
  );
  const [operador, setOperador] = useState<Operador | null>(null);
  const [offlineSessao, setOfflineSessao] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setStatus('denied');
      return;
    }

    let cancelled = false;

    setStatus('checking');

    authService
      .me()
      .then(async (response) => {
        if (cancelled) return;
        if (response.sucesso && response.dados) {
          await salvarSessaoOperador(response.dados);
          setOperador(response.dados);
          setOfflineSessao(false);
          setStatus('ok');
          return;
        }
        setStatus('denied');
      })
      .catch(async (error: unknown) => {
        if (cancelled) return;

        if (isNetworkFailure(error)) {
          const cache = await obterSessaoOperador();
          if (cache && getToken()) {
            setOperador({
              id: cache.id,
              nome: cache.nome,
              role: cache.role,
              ativo: cache.ativo,
            });
            setOfflineSessao(true);
            setStatus('ok');
            return;
          }
        }

        setStatus('denied');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'denied') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'checking' || !operador) {
    return (
      <Loading fullScreen className="bg-operator-bg" label="Validando sessão" />
    );
  }

  if (allow && !allow.includes(operador.role)) {
    return <Navigate to={rotaInicialPorRole(operador.role)} replace />;
  }

  const context: SessaoContext = {
    operador,
    role: operador.role,
    offline: offlineSessao,
  };

  return <Outlet context={context} />;
}
