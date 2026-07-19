import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, FileText, ListOrdered } from 'lucide-react';

import { dashService } from '../../../services';
import type { TipoRelatorio } from '../../../services/types';
import { RelatorioCard } from './RelatorioCard';

export function Relatorio() {
  const [gerando, setGerando] = useState<TipoRelatorio | null>(null);

  async function onGerar(tipo: TipoRelatorio) {
    setGerando(tipo);
    try {
      await dashService.gerarRelatorio(tipo);
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
              Escolha o tipo de relatório para imprimir
            </p>
          </div>

          <ul className="flex flex-col gap-3">
            <li>
              <RelatorioCard
                tipo="resumido"
                titulo="Resumido"
                descricao="Total de vendas, pedidos e top 5 do dia"
                icon={FileText}
                gerando={gerando === 'resumido'}
                disabled={gerando !== null}
                onGerar={(tipo) => void onGerar(tipo)}
              />
            </li>
            <li>
              <RelatorioCard
                tipo="completo"
                titulo="Completo"
                descricao="Todos os produtos e adicionais com valor e totais"
                icon={ListOrdered}
                gerando={gerando === 'completo'}
                disabled={gerando !== null}
                onGerar={(tipo) => void onGerar(tipo)}
              />
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
