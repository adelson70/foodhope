import { Link } from 'react-router-dom';
import { ChevronRight, Layers, Plus } from 'lucide-react';

import { ConfigBackLink } from './ConfigBackLink';

export function ConfigCozinha() {
  return (
    <div className="flex flex-col gap-6">
      <ConfigBackLink to="/painel/configuracoes" />

      <div>
        <h1 className="text-title-md font-semibold text-on-surface">
          Informações da cozinha
        </h1>
        <p className="text-caption text-on-surface-variant">
          Adicionais globais e categorias do cardápio
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        <li>
          <Link
            to="/painel/configuracoes/cozinha/adicionais"
            className="flex items-center gap-3 rounded-xl border border-operator-border bg-operator-card p-4 shadow-card transition-colors hover:border-primary/40"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/30 text-primary">
              <Plus size={19} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-md font-medium text-on-surface">
                Adicionais
              </span>
              <span className="block text-caption text-on-surface-variant">
                Globais e disponibilidade
              </span>
            </span>
            <ChevronRight
              size={17}
              strokeWidth={1.75}
              className="shrink-0 text-on-surface-variant"
              aria-hidden
            />
          </Link>
        </li>

        <li>
          <Link
            to="/painel/configuracoes/cozinha/categorias"
            className="flex items-center gap-3 rounded-xl border border-operator-border bg-operator-card p-4 shadow-card transition-colors hover:border-primary/40"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/30 text-primary">
              <Layers size={19} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-md font-medium text-on-surface">
                Categorias
              </span>
              <span className="block text-caption text-on-surface-variant">
                Ordem na home do cardápio
              </span>
            </span>
            <ChevronRight
              size={17}
              strokeWidth={1.75}
              className="shrink-0 text-on-surface-variant"
              aria-hidden
            />
          </Link>
        </li>
      </ul>
    </div>
  );
}
