import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

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
      <div className="flex min-h-screen items-center justify-center bg-operator-bg">
        <div
          className="size-8 animate-pulse rounded-full bg-primary-container/40"
          aria-label="Validando sessão"
        />
      </div>
    );
  }

  return <Outlet />;
}
