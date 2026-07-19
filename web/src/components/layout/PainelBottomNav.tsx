import {
  ClipboardList,
  LayoutDashboard,
  Settings,
  UtensilsCrossed,
} from 'lucide-react';

import type { RoleOperador } from '../../services/types';
import { FloatingBottomNav } from './FloatingBottomNav';

const dash = { to: '/painel/dash', label: 'Dash', icon: LayoutDashboard };
const cardapio = {
  to: '/painel/cardapio',
  label: 'Cardápio',
  icon: UtensilsCrossed,
};
const pedidos = { to: '/painel/pedido', label: 'Pedidos', icon: ClipboardList };
const config = {
  to: '/painel/configuracoes',
  label: 'Config',
  icon: Settings,
};

type PainelBottomNavProps = {
  role: RoleOperador;
};

export function PainelBottomNav({ role }: PainelBottomNavProps) {
  const items =
    role === 'ADMIN'
      ? [dash, cardapio, pedidos, config]
      : [cardapio, pedidos];

  return (
    <FloatingBottomNav aria-label="Navegação do painel" items={items} />
  );
}
