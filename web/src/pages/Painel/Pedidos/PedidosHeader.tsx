import { Plus } from 'lucide-react';

import { Button } from '../../../components/ui';

type PedidosHeaderProps = {
  onNovo: () => void;
};

export function PedidosHeader({ onNovo }: PedidosHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-title-md font-semibold text-on-surface">Pedidos</h1>
        <p className="text-caption text-on-surface-variant">
          Busque, crie e gerencie pedidos
        </p>
      </div>
      <Button
        type="button"
        variant="icon"
        aria-label="Novo pedido"
        onClick={onNovo}
      >
        <Plus size={22} strokeWidth={1.75} />
      </Button>
    </div>
  );
}
