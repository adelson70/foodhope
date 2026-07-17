import { Plus } from 'lucide-react';

import { Button } from '../../../components/ui';

type CardapioHeaderProps = {
  onNovo: () => void;
};

export function CardapioHeader({ onNovo }: CardapioHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-title-md font-semibold text-on-surface">Cardápio</h1>
        <p className="text-caption text-on-surface-variant">
          Busque, crie e gerencie produtos
        </p>
      </div>
      <Button
        type="button"
        variant="icon"
        aria-label="Novo produto"
        onClick={onNovo}
      >
        <Plus size={22} strokeWidth={1.75} />
      </Button>
    </div>
  );
}
