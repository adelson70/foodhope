import { Printer } from 'lucide-react';

import { Button } from '../../../components/ui';

type DashHeaderProps = {
  gerando: boolean;
  onGerarRelatorio: () => void;
};

export function DashHeader({ gerando, onGerarRelatorio }: DashHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-title-md font-semibold text-on-surface">
          Dashboard
        </h1>
        <p className="text-caption text-on-surface-variant">
          Resumo do dia com base nos pedidos e leads
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="shrink-0 px-4 py-2"
        disabled={gerando}
        onClick={onGerarRelatorio}
      >
        <Printer size={14} strokeWidth={1.75} aria-hidden />
        {gerando ? 'Gerando…' : 'Gerar relatório'}
      </Button>
    </div>
  );
}
