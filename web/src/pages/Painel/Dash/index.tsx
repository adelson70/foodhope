import { useCallback, useEffect, useRef, useState } from 'react';

import { useDeferredLoading } from '../../../hooks/useDeferredLoading';
import { PULL_REFRESH_EVENT } from '../../../hooks/usePullToRefresh';
import { dashService, getApiErrorMensagens } from '../../../services';
import type { DashDados } from '../../../services/types';
import { DashCharts } from './DashCharts';
import { DashDestaques } from './DashDestaques';
import { DashHeader } from './DashHeader';
import { DashKpis } from './DashKpis';
import { DashSkeleton } from './DashSkeleton';

export function Dash() {
  const [dados, setDados] = useState<DashDados | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const showSkeleton = useDeferredLoading(loading);
  const requestIdRef = useRef(0);

  const carregar = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setErro(null);

    try {
      const response = await dashService.obter();
      if (requestId !== requestIdRef.current) return;
      if (!response.sucesso || !response.dados) {
        setErro('Não foi possível carregar o dashboard.');
        setDados(null);
        return;
      }
      setDados(response.dados);
    } catch (error: unknown) {
      if (requestId !== requestIdRef.current) return;
      const mensagens = getApiErrorMensagens(error);
      setErro(mensagens[0] ?? 'Não foi possível carregar o dashboard.');
      setDados(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    function onPullRefresh() {
      void carregar();
    }
    window.addEventListener(PULL_REFRESH_EVENT, onPullRefresh);
    return () => {
      window.removeEventListener(PULL_REFRESH_EVENT, onPullRefresh);
    };
  }, [carregar]);

  if (showSkeleton) {
    return <DashSkeleton />;
  }

  if (loading || (!dados && !erro)) {
    return (
      <div
        className="min-h-40"
        aria-busy="true"
        aria-label="Carregando dashboard"
      />
    );
  }

  if (erro || !dados) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-caption text-danger">
        {erro ?? 'Não foi possível carregar o dashboard.'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DashHeader />

      <DashKpis
        faturamentoHoje={dados.faturamentoHoje}
        comprasHoje={dados.comprasHoje}
        leadsTotal={dados.leadsTotal}
      />

      <DashDestaques
        produtoMaisVendido={dados.produtoMaisVendido}
        adicionalMaisVendido={dados.adicionalMaisVendido}
      />

      <DashCharts
        topProdutos={dados.topProdutos}
        topAdicionais={dados.topAdicionais}
      />
    </div>
  );
}
