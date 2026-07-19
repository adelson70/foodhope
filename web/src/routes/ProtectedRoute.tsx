import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { Loading } from '../components/ui';
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

  useEffect(() => {
    if (!getToken()) {
      setStatus('denied');
      return;
    }

    let cancelled = false;

    setStatus('checking');

    authService
      .me()
      .then((response) => {
        if (cancelled) return;
        if (response.sucesso && response.dados) {
          setOperador(response.dados);
          setStatus('ok');
        } else {
          setStatus('denied');
        }
      })
      .catch(() => {
        if (cancelled) return;
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

  const context: SessaoContext = { operador, role: operador.role };

  return <Outlet context={context} />;
}
