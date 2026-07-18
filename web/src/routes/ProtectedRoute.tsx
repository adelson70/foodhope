import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { Loading } from '../components/ui';
import { authService, getToken } from '../services';

type GuardStatus = 'checking' | 'ok' | 'denied';

export function ProtectedRoute() {
  const [status, setStatus] = useState<GuardStatus>(() =>
    getToken() ? 'checking' : 'denied',
  );

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
        setStatus(response.sucesso && response.dados ? 'ok' : 'denied');
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

  if (status === 'checking') {
    return (
      <Loading fullScreen className="bg-operator-bg" label="Validando sessão" />
    );
  }

  return <Outlet />;
}
