import { ClipboardList, ShoppingCart, UtensilsCrossed } from 'lucide-react';

import { useCarrinhoStore } from '../../stores/carrinho.store';
import { FloatingBottomNav, type FloatingNavItem } from './FloatingBottomNav';

type ClienteBottomNavProps = {
  isTotem?: boolean;
};

export function ClienteBottomNav({ isTotem = false }: ClienteBottomNavProps) {
  const totalItens = useCarrinhoStore((state) => state.totalItens);

  const carrinho: FloatingNavItem = {
    to: '/carrinho',
    label: 'Carrinho',
    icon: ShoppingCart,
    badge:
      totalItens > 0 ? (
        <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-semibold leading-none text-on-primary">
          {totalItens > 99 ? '99+' : totalItens}
        </span>
      ) : null,
  };

  const cardapio: FloatingNavItem = {
    to: '/',
    label: 'Cardápio',
    icon: UtensilsCrossed,
    end: true,
  };

  const items: FloatingNavItem[] = isTotem
    ? [cardapio, carrinho]
    : [
        { to: '/pedidos', label: 'Pedidos', icon: ClipboardList },
        cardapio,
        carrinho,
      ];

  return <FloatingBottomNav aria-label="Navegação do cardápio" items={items} />;
}
