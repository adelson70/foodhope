import type { Pedido } from '../../../services/types';
import { TelaPedidosCard } from './TelaPedidosCard';
import { TelaPedidosCardSkeleton } from './TelaPedidosCardSkeleton';

type TelaPedidosListaProps = {
  pedidos: Pedido[];
  loading: boolean;
  pending: boolean;
  erro: string | null;
};

const SKELETON_COUNT = 12;
const GRADE =
  'grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8';

export function TelaPedidosLista({
  pedidos,
  loading,
  pending,
  erro,
}: TelaPedidosListaProps) {
  if (loading) {
    return (
      <ul
        className={GRADE}
        aria-busy="true"
        aria-label="Carregando pedidos"
      >
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <li key={index}>
            <TelaPedidosCardSkeleton />
          </li>
        ))}
      </ul>
    );
  }

  if (pending) {
    return (
      <div className="min-h-40" aria-busy="true" aria-label="Carregando pedidos" />
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
      <div className="rounded-xl border border-operator-border bg-operator-card px-4 py-16 text-center shadow-card">
        <p className="text-headline-lg text-on-surface">Aguardando pedidos</p>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Os pedidos aparecem aqui assim que saem
        </p>
      </div>
    );
  }

  return (
    <ul className={GRADE}>
      {pedidos.map((pedido) => (
        <li key={pedido.id}>
          <TelaPedidosCard pedido={pedido} />
        </li>
      ))}
    </ul>
  );
}
