import { Package, PlusCircle } from 'lucide-react';

import type { DashItemRank } from '../../../services/types';

type DashDestaquesProps = {
  produtoMaisVendido: DashItemRank | null;
  adicionalMaisVendido: DashItemRank | null;
};

function DestaqueCard({
  titulo,
  item,
  icon: Icon,
}: {
  titulo: string;
  item: DashItemRank | null;
  icon: typeof Package;
}) {
  return (
    <article className="rounded-xl border border-operator-border bg-operator-card px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-on-surface-variant">
        <Icon size={14} strokeWidth={1.75} aria-hidden />
        <p className="text-caption">{titulo}</p>
      </div>
      {item ? (
        <div className="space-y-1">
          <p className="text-subtitle-md font-semibold text-on-surface truncate">
            {item.nome}
          </p>
          <p className="text-caption text-primary-container">
            {item.quantidade}{' '}
            {item.quantidade === 1 ? 'unidade' : 'unidades'}
          </p>
        </div>
      ) : (
        <p className="text-caption text-on-surface-variant">
          Sem vendas hoje
        </p>
      )}
    </article>
  );
}

export function DashDestaques({
  produtoMaisVendido,
  adicionalMaisVendido,
}: DashDestaquesProps) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <DestaqueCard
        titulo="Produto que mais saiu"
        item={produtoMaisVendido}
        icon={Package}
      />
      <DestaqueCard
        titulo="Adicional que mais saiu"
        item={adicionalMaisVendido}
        icon={PlusCircle}
      />
    </section>
  );
}
