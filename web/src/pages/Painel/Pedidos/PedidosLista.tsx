import type { Pedido } from '../../../services/types';
import { PedidoCard } from './PedidoCard';

type PedidosListaProps = {
  pedidos: Pedido[];
  loading: boolean;
  erro: string | null;
  buscaAtiva: boolean;
  onDelete: (pedido: Pedido) => void;
};

export function PedidosLista({
  pedidos,
  loading,
  erro,
  buscaAtiva,
  onDelete,
}: PedidosListaProps) {
  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <div
          className="size-8 animate-pulse rounded-full bg-primary-container/40"
          aria-label="Carregando pedidos"
        />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-caption text-danger">
        {erro}
      </div>
    );
  }

  if (pedidos.length === 0) {
    return (
      <div className="rounded-xl border border-operator-border bg-operator-card px-4 py-8 text-center">
        <p className="text-body-md text-on-surface-variant">
          {buscaAtiva
            ? 'Nenhum pedido encontrado para essa busca.'
            : 'Nenhum pedido ainda.'}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {pedidos.map((pedido) => (
        <li key={pedido.id}>
          <PedidoCard pedido={pedido} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  );
}
