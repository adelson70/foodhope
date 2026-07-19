import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, FileText, ListOrdered } from 'lucide-react';

import { Input, Label } from '../../../components/ui';
import { dashService } from '../../../services';
import type { TipoRelatorio } from '../../../services/types';
import { RelatorioCard } from './RelatorioCard';

function hojeSpIso(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Sao_Paulo',
  });
}

function isoParaBr(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  if (!ano || !mes || !dia) return '';
  return `${dia}/${mes}/${ano}`;
}

export function Relatorio() {
  const [data, setData] = useState(hojeSpIso);
  const [gerando, setGerando] = useState<TipoRelatorio | null>(null);

  async function onGerar(tipo: TipoRelatorio) {
    if (!data) return;
    setGerando(tipo);
    try {
      await dashService.gerarRelatorio(tipo, data);
    } catch {
      return;
    } finally {
      setGerando(null);
    }
  }

  return (
    <div className="flex min-h-dvh justify-center bg-background text-on-background">
      <div className="flex w-full max-w-md flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Link
          to="/painel/dash"
          className="mt-2 inline-flex items-center gap-1 self-start text-body-md text-on-surface transition-colors hover:text-primary"
        >
          <ChevronLeft size={17} strokeWidth={1.75} aria-hidden />
          Voltar
        </Link>

        <div className="mt-4 flex flex-col gap-6">
          <div>
            <h1 className="text-title-md font-semibold text-on-surface">
              Relatórios
            </h1>
            <p className="text-caption text-on-surface-variant">
              Escolha a data e o tipo de relatório para imprimir
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="relatorio-data">Data</Label>
            <div className="relative">
              <Input
                id="relatorio-data-display"
                type="text"
                readOnly
                tabIndex={-1}
                placeholder="dd/mm/aaaa"
                value={isoParaBr(data)}
                disabled={gerando !== null}
                className="pointer-events-none"
              />
              <input
                id="relatorio-data"
                type="date"
                lang="pt-BR"
                value={data}
                max={hojeSpIso()}
                disabled={gerando !== null}
                onChange={(event) => setData(event.target.value)}
                aria-label="Data do relatório"
                className="absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <ul className="flex flex-col gap-3">
            <li>
              <RelatorioCard
                tipo="resumido"
                titulo="Resumido"
                descricao="Total de vendas, pedidos e top 5 do dia"
                icon={FileText}
                gerando={gerando === 'resumido'}
                disabled={gerando !== null || !data}
                onGerar={(tipo) => void onGerar(tipo)}
              />
            </li>
            <li>
              <RelatorioCard
                tipo="completo"
                titulo="Completo"
                descricao="Nome de cada cliente, valor do pedido e total"
                icon={ListOrdered}
                gerando={gerando === 'completo'}
                disabled={gerando !== null || !data}
                onGerar={(tipo) => void onGerar(tipo)}
              />
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
