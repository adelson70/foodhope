import { ClipboardList, Home, ShoppingCart } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { cn } from '../../lib/cn';
import { useCarrinhoStore } from '../../stores/carrinho.store';

const items = [
  { to: '/pedidos', label: 'Pedidos', icon: ClipboardList, end: false },
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/carrinho', label: 'Carrinho', icon: ShoppingCart, end: false },
] as const;

export function ClienteBottomNav() {
  const totalItens = useCarrinhoStore((state) => state.totalItens);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-operator-border bg-operator-surface pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação do cardápio"
    >
      <ul className="grid grid-cols-3">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors',
                  isActive
                    ? 'text-primary-container'
                    : 'text-on-surface-variant hover:text-on-surface',
                )
              }
            >
              <span className="relative">
                <Icon size={22} strokeWidth={1.75} aria-hidden />
                {to === '/carrinho' && totalItens > 0 ? (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-semibold leading-none text-on-primary">
                    {totalItens > 99 ? '99+' : totalItens}
                  </span>
                ) : null}
              </span>
              <span className="text-caption leading-none">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
