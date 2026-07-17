import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, ChevronRight, UserRound } from 'lucide-react';

import { ConfigLogout } from './ConfigLogout';
import { ConfigUsuarioDrawer } from './ConfigUsuarioDrawer';

export function Config() {
  const [usuarioAberto, setUsuarioAberto] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-md font-semibold text-on-surface">
          Configurações
        </h1>
        <p className="text-caption text-on-surface-variant">
          Escolha o que deseja configurar
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        <li>
          <button
            type="button"
            onClick={() => setUsuarioAberto(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-operator-border bg-operator-card p-4 text-left shadow-card transition-colors hover:border-primary/40"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/30 text-primary">
              <UserRound size={22} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-md font-medium text-on-surface">
                Informações do usuário
              </span>
              <span className="block text-caption text-on-surface-variant">
                Nome e senha do operador
              </span>
            </span>
            <ChevronRight
              size={20}
              strokeWidth={1.75}
              className="shrink-0 text-on-surface-variant"
              aria-hidden
            />
          </button>
        </li>

        <li>
          <Link
            to="/painel/configuracoes/cozinha"
            className="flex items-center gap-3 rounded-xl border border-operator-border bg-operator-card p-4 shadow-card transition-colors hover:border-primary/40"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/30 text-primary">
              <ChefHat size={22} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-md font-medium text-on-surface">
                Informações da cozinha
              </span>
              <span className="block text-caption text-on-surface-variant">
                Adicionais globais e disponibilidade
              </span>
            </span>
            <ChevronRight
              size={20}
              strokeWidth={1.75}
              className="shrink-0 text-on-surface-variant"
              aria-hidden
            />
          </Link>
        </li>
      </ul>

      <div className="border-t border-operator-border pt-4">
        <ConfigLogout />
      </div>

      <ConfigUsuarioDrawer
        open={usuarioAberto}
        onClose={() => setUsuarioAberto(false)}
      />
    </div>
  );
}
