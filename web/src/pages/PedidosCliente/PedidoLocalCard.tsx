import type { PedidoLocal } from '../../lib/clienteStorage';

type PedidoLocalCardProps = {
  pedido: PedidoLocal;
  onSelect: (pedido: PedidoLocal) => void;
};

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PedidoLocalCard({ pedido, onSelect }: PedidoLocalCardProps) {
  const resumo = pedido.itens
    .slice(0, 2)
    .map((item) => `${item.qtd}× ${item.nome}`)
    .join(', ');
  const restantes = pedido.itens.length - Math.min(pedido.itens.length, 2);

  return (
    <button
      type="button"
      onClick={() => onSelect(pedido)}
      className="w-full rounded-xl border border-operator-border bg-operator-card p-4 text-left transition-colors hover:border-primary-container/40"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-label-sm uppercase tracking-widest text-primary-container">
          #{pedido.numero}
        </span>
        <span className="text-caption text-on-surface-variant">
          {formatarData(pedido.createdAt)}
        </span>
      </div>
      <p className="mt-1 truncate text-subtitle-md text-on-surface">
        {pedido.nome_completo}
      </p>
      {resumo ? (
        <p className="mt-1 text-caption text-on-surface-variant">
          {resumo}
          {restantes > 0 ? ` +${restantes}` : ''}
        </p>
      ) : null}
    </button>
  );
}
