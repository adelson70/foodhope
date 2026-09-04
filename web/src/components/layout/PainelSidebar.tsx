import { NavLink, useLocation } from 'react-router-dom';

import { cn } from '../../lib/cn';
import type { RoleOperador } from '../../services/types';
import { FoodHopeLogo } from '../brand/FoodHopeLogo';
import { isPainelNavActive, painelNavItems } from './painelNavItems';

type PainelSidebarProps = {
  role: RoleOperador;
};

export function PainelSidebar({ role }: PainelSidebarProps) {
  const { pathname } = useLocation();
  const items = painelNavItems(role);

  return (
    <aside className="hidden h-dvh w-60 shrink-0 flex-col border-r border-outline-variant/50 bg-nav-bar lg:flex">
      <div className="shrink-0 border-b border-outline-variant/50 px-4 py-4">
        <FoodHopeLogo markClassName="size-7" />
      </div>

      <nav
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3"
        aria-label="Navegação do painel"
      >
        {items.map(({ to, label, icon: Icon }) => {
          const active = isPainelNavActive(pathname, to);

          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-md transition-colors',
                active
                  ? 'bg-primary-container/40 font-medium text-on-surface'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
              )}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2.25 : 1.75}
                aria-hidden
              />
              {label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
