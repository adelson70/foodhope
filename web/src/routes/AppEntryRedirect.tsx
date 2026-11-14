import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { Loading } from '../components/ui';
import { isDispositivoEquipe } from '../lib/dispositivoEquipe';
import { rotaInicialPorRole } from '../lib/rotaPorRole';
import { obterSessaoOperador } from '../lib/sessaoOperador';
import { getToken } from '../services';

/**
 * Entrada do PWA (start_url). Decide pela sessão local, sem rede:
 * equipe logada vai para a rota do perfil; aparelho da equipe sem sessão
 * (cookie expirado ou logout) vai para o login; demais, para o cardápio.
 */
export function AppEntryRedirect() {
  const [destino, setDestino] = useState<string | null>(() => {
    if (getToken()) return null;
    return isDispositivoEquipe() ? '/login' : '/';
  });

  useEffect(() => {
    if (destino) return;
    let cancelled = false;
    void obterSessaoOperador()
      .then((sessao) => {
        if (cancelled) return;
        setDestino(sessao?.role ? rotaInicialPorRole(sessao.role) : '/painel');
      })
      .catch(() => {
        if (!cancelled) setDestino('/painel');
      });
    return () => {
      cancelled = true;
    };
  }, [destino]);

  if (!destino) {
    return <Loading fullScreen label="Abrindo" />;
  }

  return <Navigate to={destino} replace />;
}
