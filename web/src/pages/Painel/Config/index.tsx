import { useEffect, useState } from 'react';

import { authService, getApiErrorMensagens } from '../../../services';
import type { Operador } from '../../../services/types';
import { ConfigForm } from './ConfigForm';
import { ConfigLogout } from './ConfigLogout';

export function Config() {
  const [operador, setOperador] = useState<Operador | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setErro(null);

    authService
      .me()
      .then((response) => {
        if (cancelled) return;
        if (!response.sucesso || !response.dados) {
          setErro('Não foi possível carregar as configurações.');
          setOperador(null);
          return;
        }
        setOperador(response.dados);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const mensagens = getApiErrorMensagens(error);
        setErro(
          mensagens[0] ?? 'Não foi possível carregar as configurações.',
        );
        setOperador(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <div
          className="size-8 animate-pulse rounded-full bg-primary-container/40"
          aria-label="Carregando configurações"
        />
      </div>
    );
  }

  if (erro || !operador) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-caption text-danger">
        {erro ?? 'Não foi possível carregar as configurações.'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-md font-semibold text-on-surface">
          Configurações
        </h1>
        <p className="text-caption text-on-surface-variant">
          Redefina seu nome e senha
        </p>
      </div>

      <ConfigForm
        key={operador.nome}
        operador={operador}
        onUpdated={setOperador}
      />

      <div className="border-t border-operator-border pt-4">
        <ConfigLogout />
      </div>
    </div>
  );
}
