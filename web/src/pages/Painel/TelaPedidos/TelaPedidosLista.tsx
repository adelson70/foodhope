import type { Pedido } from '../../../services/types';
import { TelaPedidosCard } from './TelaPedidosCard';
import { TelaPedidosCardSkeleton } from './TelaPedidosCardSkeleton';

type TelaPedidosListaProps = {
  pedidos: Pedido[];
  loading: boolean;
  pending: boolean;
  erro: string | null;
};

export const PEDIDOS_POR_TELA = 6;

const SKELETON_COUNT = PEDIDOS_POR_TELA;
const GRADE =
  'grid h-full min-h-0 grid-cols-3 grid-rows-2 gap-1.5';

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
          <li key={index} className="min-h-0">
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
      <div className="flex h-full items-center justify-center rounded-xl bg-success px-4 py-16 text-center shadow-card">
        <div>
          <p className="font-extrabold text-surface-container-low text-[5vh]">
            Aguardando pedidos
          </p>
          <p className="mt-2 text-surface-container-low/80 text-[2.5vh]">
            Os pedidos aparecem aqui assim que saem
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className={GRADE}>
      {pedidos.map((pedido) => (
        <li key={pedido.id} className="min-h-0">
          <TelaPedidosCard pedido={pedido} />
        </li>
      ))}
    </ul>
  );
}
