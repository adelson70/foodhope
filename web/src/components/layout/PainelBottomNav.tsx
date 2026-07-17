import {
  ClipboardList,
  LayoutDashboard,
  Settings,
  UtensilsCrossed,
} from 'lucide-react';

import { FloatingBottomNav } from './FloatingBottomNav';

const items = [
  { to: '/painel/dash', label: 'Dash', icon: LayoutDashboard },
  { to: '/painel/cardapio', label: 'Cardápio', icon: UtensilsCrossed },
  { to: '/painel/pedido', label: 'Pedidos', icon: ClipboardList },
  { to: '/painel/configuracoes', label: 'Config', icon: Settings },
] as const;

export function PainelBottomNav() {
  return (
    <FloatingBottomNav aria-label="Navegação do painel" items={items} />
  );
}
