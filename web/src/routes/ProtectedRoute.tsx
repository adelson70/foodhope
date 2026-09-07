import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { Loading } from '../components/ui';
import { useOnReconnect } from '../hooks/useOnReconnect';
import { useAppOffline } from '../hooks/usePedidoOutboxSync';
import { isAppOffline, marcarApiInalcancavel } from '../lib/conectividade';
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

function operadorDoCache(cache: {
  id: string;
  nome: string;
  role: RoleOperador;
  ativo: boolean;
}): Operador {
  return {
    id: cache.id,
    nome: cache.nome,
    role: cache.role,
    ativo: cache.ativo,
  };
}

export function ProtectedRoute({ allow }: ProtectedRouteProps) {
  const appOffline = useAppOffline();
  const [status, setStatus] = useState<GuardStatus>(() =>
    getToken() ? 'checking' : 'denied',
  );
  const [operador, setOperador] = useState<Operador | null>(null);
  const [offlineSessao, setOfflineSessao] = useState(false);
  const bootFeitoRef = useRef(false);

  useEffect(() => {
    if (!getToken()) {
      setStatus('denied');
      return;
    }

    let cancelled = false;

    void (async () => {
      const cache = await obterSessaoOperador();
      if (cancelled) return;

      if (isAppOffline()) {
        if (cache && getToken()) {
          setOperador(operadorDoCache(cache));
          setOfflineSessao(true);
          setStatus('ok');
          bootFeitoRef.current = true;
          return;
        }
        setStatus('denied');
        return;
      }

      if (cache && getToken()) {
        setOperador(operadorDoCache(cache));
        setOfflineSessao(false);
        setStatus('ok');
      } else {
        setStatus('checking');
      }

      try {
        const response = await authService.me();
        if (cancelled) return;
        if (response.sucesso && response.dados) {
          await salvarSessaoOperador(response.dados);
          setOperador(response.dados);
          setOfflineSessao(false);
          setStatus('ok');
          bootFeitoRef.current = true;
          return;
        }
        if (!cache) setStatus('denied');
      } catch (error: unknown) {
        if (cancelled) return;

        if (isNetworkFailure(error)) {
          marcarApiInalcancavel();
          if (cache && getToken()) {
            setOperador(operadorDoCache(cache));
            setOfflineSessao(true);
            setStatus('ok');
            bootFeitoRef.current = true;
            return;
          }
        }

        setStatus('denied');
      } finally {
        bootFeitoRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useOnReconnect(() => {
    if (!bootFeitoRef.current || !getToken()) return;

    void authService
      .me()
      .then(async (response) => {
        if (response.sucesso && response.dados) {
          await salvarSessaoOperador(response.dados);
          setOperador(response.dados);
          setOfflineSessao(false);
          setStatus('ok');
        }
      })
      .catch((error: unknown) => {
        if (isNetworkFailure(error)) {
          marcarApiInalcancavel();
          setOfflineSessao(true);
        }
      });
  });

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
    offline: offlineSessao || appOffline,
  };

  return <Outlet context={context} />;
}
