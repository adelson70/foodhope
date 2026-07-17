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

function tituloItens(pedido: PedidoLocal): string {
  const nomes = pedido.itens.map((item) =>
    item.qtd > 1 ? `${item.qtd}× ${item.nome}` : item.nome,
  );
  if (nomes.length <= 2) return nomes.join(', ');
  return `${nomes.slice(0, 2).join(', ')} +${nomes.length - 2}`;
}

function resumoObservacoes(pedido: PedidoLocal): string | null {
  const obs = pedido.itens
    .map((item) => item.observacao?.trim())
    .filter((valor): valor is string => Boolean(valor));
  if (obs.length === 0) return null;
  return obs.join(' · ');
}

export function PedidoLocalCard({ pedido, onSelect }: PedidoLocalCardProps) {
  const titulo = tituloItens(pedido);
  const observacao = resumoObservacoes(pedido);

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
        {titulo || 'Pedido'}
      </p>
      {observacao ? (
        <p className="mt-1 truncate text-caption text-on-surface-variant">
          {observacao}
        </p>
      ) : null}
    </button>
  );
}
