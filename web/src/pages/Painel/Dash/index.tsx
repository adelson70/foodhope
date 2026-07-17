import { useEffect, useState } from 'react';

import { useDeferredLoading } from '../../../hooks/useDeferredLoading';
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
  const [gerando, setGerando] = useState(false);
  const showSkeleton = useDeferredLoading(loading);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setErro(null);

    dashService
      .obter()
      .then((response) => {
        if (cancelled) return;
        if (!response.sucesso || !response.dados) {
          setErro('Não foi possível carregar o dashboard.');
          setDados(null);
          return;
        }
        setDados(response.dados);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const mensagens = getApiErrorMensagens(error);
        setErro(mensagens[0] ?? 'Não foi possível carregar o dashboard.');
        setDados(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function onGerarRelatorio() {
    setGerando(true);
    try {
      await dashService.gerarRelatorio();
    } catch {
      return;
    } finally {
      setGerando(false);
    }
  }

  if (showSkeleton) {
    return <DashSkeleton />;
  }

  if (loading || (!dados && !erro)) {
    return (
      <div className="min-h-40" aria-busy="true" aria-label="Carregando dashboard" />
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
      <DashHeader gerando={gerando} onGerarRelatorio={() => void onGerarRelatorio()} />

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
