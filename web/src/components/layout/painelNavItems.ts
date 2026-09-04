import {
  ClipboardList,
  LayoutDashboard,
  Settings,
  UtensilsCrossed,
} from 'lucide-react';

import type { RoleOperador } from '../../services/types';
import type { FloatingNavItem } from './FloatingBottomNav';

const dash: FloatingNavItem = {
  to: '/painel/dash',
  label: 'Dash',
  icon: LayoutDashboard,
};
const cardapio: FloatingNavItem = {
  to: '/painel/cardapio',
  label: 'Cardápio',
  icon: UtensilsCrossed,
};
const pedidos: FloatingNavItem = {
  to: '/painel/pedido',
  label: 'Pedidos',
  icon: ClipboardList,
};
const config: FloatingNavItem = {
  to: '/painel/configuracoes',
  label: 'Config',
  icon: Settings,
};

export function painelNavItems(role: RoleOperador): FloatingNavItem[] {
  return role === 'ADMIN'
    ? [dash, cardapio, pedidos, config]
    : [cardapio, pedidos];
}

export function isPainelNavActive(pathname: string, to: string) {
  if (to === '/painel/dash') {
    return pathname === to || pathname.startsWith(`${to}/`) || pathname === '/painel/relatorio';
  }
  if (to === '/painel/configuracoes') {
    return (
      pathname === to || pathname.startsWith(`${to}/`)
    );
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}
