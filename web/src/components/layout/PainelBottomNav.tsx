import {
  ClipboardList,
  LayoutDashboard,
  Settings,
  UtensilsCrossed,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { cn } from '../../lib/cn';

const items = [
  { to: '/painel/dash', label: 'Dash', icon: LayoutDashboard },
  { to: '/painel/cardapio', label: 'Cardápio', icon: UtensilsCrossed },
  { to: '/painel/pedido', label: 'Pedidos', icon: ClipboardList },
  { to: '/painel/configuracoes', label: 'Config', icon: Settings },
] as const;

export function PainelBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-operator-border bg-operator-surface pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação do painel"
    >
      <ul className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors',
                  isActive
                    ? 'text-primary-container'
                    : 'text-on-surface-variant hover:text-on-surface',
                )
              }
            >
              <Icon size={22} strokeWidth={1.75} aria-hidden />
              <span className="text-caption leading-none">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
