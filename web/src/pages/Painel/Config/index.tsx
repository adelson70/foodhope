import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChefHat,
  ChevronRight,
  CreditCard,
  Printer,
  Users,
  UserRound,
  Monitor,
} from 'lucide-react';

import { ConfigImpressoraDrawer } from './ConfigImpressoraDrawer';
import { ConfigInfinitePayDrawer } from './ConfigInfinitePayDrawer';
import { ConfigLogout } from './ConfigLogout';
import { ConfigTelaPedidosDrawer } from './ConfigTelaPedidosDrawer';
import { ConfigUsuarioDrawer } from './ConfigUsuarioDrawer';

export function Config() {
  const [usuarioAberto, setUsuarioAberto] = useState(false);
  const [impressoraAberta, setImpressoraAberta] = useState(false);
  const [infinitePayAberta, setInfinitePayAberta] = useState(false);
  const [telaPedidosAberta, setTelaPedidosAberta] = useState(false);

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

      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <li>
          <button
            type="button"
            onClick={() => setUsuarioAberto(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-operator-border bg-operator-card p-4 text-left shadow-card transition-colors hover:border-primary/40"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/30 text-primary">
              <UserRound size={19} strokeWidth={1.75} aria-hidden />
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
              size={17}
              strokeWidth={1.75}
              className="shrink-0 text-on-surface-variant"
              aria-hidden
            />
          </button>
        </li>

        <li>
          <Link
            to="/painel/configuracoes/usuarios"
            className="flex items-center gap-3 rounded-xl border border-operator-border bg-operator-card p-4 shadow-card transition-colors hover:border-primary/40"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/30 text-primary">
              <Users size={19} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-md font-medium text-on-surface">
                Usuários
              </span>
              <span className="block text-caption text-on-surface-variant">
                Administradores, operadores e totens
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
            to="/painel/configuracoes/cozinha"
            className="flex items-center gap-3 rounded-xl border border-operator-border bg-operator-card p-4 shadow-card transition-colors hover:border-primary/40"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/30 text-primary">
              <ChefHat size={19} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-md font-medium text-on-surface">
                Operação da cozinha
              </span>
              <span className="block text-caption text-on-surface-variant">
                Abertura, adicionais e categorias
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
          <button
            type="button"
            onClick={() => setImpressoraAberta(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-operator-border bg-operator-card p-4 text-left shadow-card transition-colors hover:border-primary/40"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/30 text-primary">
              <Printer size={19} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-md font-medium text-on-surface">
                Impressora
              </span>
              <span className="block text-caption text-on-surface-variant">
                IP, porta local e conexão
              </span>
            </span>
            <ChevronRight
              size={17}
              strokeWidth={1.75}
              className="shrink-0 text-on-surface-variant"
              aria-hidden
            />
          </button>
        </li>

        <li>
          <button
            type="button"
            onClick={() => setTelaPedidosAberta(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-operator-border bg-operator-card p-4 text-left shadow-card transition-colors hover:border-primary/40"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/30 text-primary">
              <Monitor size={19} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-md font-medium text-on-surface">
                Tela de pedidos prontos
              </span>
              <span className="block text-caption text-on-surface-variant">
                Link público para TV ou kiosk
              </span>
            </span>
            <ChevronRight
              size={17}
              strokeWidth={1.75}
              className="shrink-0 text-on-surface-variant"
              aria-hidden
            />
          </button>
        </li>

        <li>
          <button
            type="button"
            onClick={() => setInfinitePayAberta(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-operator-border bg-operator-card p-4 text-left shadow-card transition-colors hover:border-primary/40"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/30 text-primary">
              <CreditCard size={19} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-md font-medium text-on-surface">
                InfinitePay
              </span>
              <span className="block text-caption text-on-surface-variant">
                Checkout online e InfiniteTag
              </span>
            </span>
            <ChevronRight
              size={17}
              strokeWidth={1.75}
              className="shrink-0 text-on-surface-variant"
              aria-hidden
            />
          </button>
        </li>
      </ul>

      <div className="border-t border-operator-border pt-4">
        <ConfigLogout />
      </div>

      <ConfigUsuarioDrawer
        open={usuarioAberto}
        onClose={() => setUsuarioAberto(false)}
      />

      <ConfigImpressoraDrawer
        open={impressoraAberta}
        onClose={() => setImpressoraAberta(false)}
      />

      <ConfigTelaPedidosDrawer
        open={telaPedidosAberta}
        onClose={() => setTelaPedidosAberta(false)}
      />

      <ConfigInfinitePayDrawer
        open={infinitePayAberta}
        onClose={() => setInfinitePayAberta(false)}
      />
    </div>
  );
}
