import type { RefObject } from 'react';

import type { Pedido } from '../../../services/types';
import { PedidoCard } from './PedidoCard';
import { PedidoCardSkeleton } from './PedidoCardSkeleton';

type PedidosListaProps = {
  pedidos: Pedido[];
  loading: boolean;
  loadingMore: boolean;
  pending: boolean;
  hasNextPage: boolean;
  erro: string | null;
  buscaAtiva: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onDelete: (pedido: Pedido) => void;
};

const SKELETON_COUNT = 4;
const LOAD_MORE_SKELETON_COUNT = 2;

export function PedidosLista({
  pedidos,
  loading,
  loadingMore,
  pending,
  hasNextPage,
  erro,
  buscaAtiva,
  sentinelRef,
  onDelete,
}: PedidosListaProps) {
  if (loading) {
    return (
      <ul
        className="flex flex-col gap-3"
        aria-busy="true"
        aria-label="Carregando pedidos"
      >
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <li key={index}>
            <PedidoCardSkeleton />
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
      {loadingMore
        ? Array.from({ length: LOAD_MORE_SKELETON_COUNT }, (_, index) => (
            <li key={`more-${index}`}>
              <PedidoCardSkeleton />
            </li>
          ))
        : null}
      {hasNextPage ? (
        <li aria-hidden>
          <div ref={sentinelRef} className="h-1" />
        </li>
      ) : null}
    </ul>
  );
}
