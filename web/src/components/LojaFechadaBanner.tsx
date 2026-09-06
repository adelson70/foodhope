import { Store } from 'lucide-react';

type LojaFechadaBannerProps = {
  className?: string;
};

export function LojaFechadaBanner({ className }: LojaFechadaBannerProps) {
  return (
    <div
      role="status"
      className={
        className ??
        'flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3'
      }
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger">
        <Store size={18} strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-body-md font-medium text-on-surface">Loja fechada</p>
        <p className="text-caption text-on-surface-variant">
          A cozinha não está aceitando pedidos no momento. Você pode ver o
          cardápio, mas não finalizar a compra.
        </p>
      </div>
    </div>
  );
}
