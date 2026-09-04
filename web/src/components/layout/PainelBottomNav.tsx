import type { RoleOperador } from '../../services/types';
import { FloatingBottomNav } from './FloatingBottomNav';
import { painelNavItems } from './painelNavItems';

type PainelBottomNavProps = {
  role: RoleOperador;
};

export function PainelBottomNav({ role }: PainelBottomNavProps) {
  return (
    <div className="lg:hidden">
      <FloatingBottomNav
        aria-label="Navegação do painel"
        items={painelNavItems(role)}
      />
    </div>
  );
}
