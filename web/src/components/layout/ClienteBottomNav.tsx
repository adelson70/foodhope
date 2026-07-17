import { ClipboardList, ShoppingCart, UtensilsCrossed } from 'lucide-react';

import { useCarrinhoStore } from '../../stores/carrinho.store';
import { FloatingBottomNav } from './FloatingBottomNav';

export function ClienteBottomNav() {
  const totalItens = useCarrinhoStore((state) => state.totalItens);

  return (
    <FloatingBottomNav
      aria-label="Navegação do cardápio"
      items={[
        { to: '/pedidos', label: 'Pedidos', icon: ClipboardList },
        { to: '/', label: 'Cardápio', icon: UtensilsCrossed, end: true },
        {
          to: '/carrinho',
          label: 'Carrinho',
          icon: ShoppingCart,
          badge:
            totalItens > 0 ? (
              <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-semibold leading-none text-on-primary">
                {totalItens > 99 ? '99+' : totalItens}
              </span>
            ) : null,
        },
      ]}
    />
  );
}
