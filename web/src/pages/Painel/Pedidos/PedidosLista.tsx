import type { Ref } from 'react';

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
  filtroData?: boolean;
  sentinelRef: Ref<HTMLDivElement>;
  prontoLoadingId: string | null;
  pagoLoadingId: string | null;
  onSelect: (pedido: Pedido) => void;
  onPronto: (pedido: Pedido) => void;
  onMarcarPago: (pedido: Pedido) => void;
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
  filtroData,
  sentinelRef,
  prontoLoadingId,
  pagoLoadingId,
  onSelect,
  onPronto,
  onMarcarPago,
  onDelete,
}: PedidosListaProps) {
  if (loading) {
    return (
      <ul
        className="grid grid-cols-1 gap-3 lg:grid-cols-2"
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
            : filtroData
              ? 'Nenhum pedido nesse dia.'
              : 'Nenhum pedido ainda.'}
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {pedidos.map((pedido) => (
        <li key={pedido.id}>
          <PedidoCard
            pedido={pedido}
            prontoLoading={prontoLoadingId === pedido.id}
            pagoLoading={pagoLoadingId === pedido.id}
            onSelect={onSelect}
            onPronto={onPronto}
            onMarcarPago={onMarcarPago}
            onDelete={onDelete}
          />
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
        <li aria-hidden className="lg:col-span-2">
          <div ref={sentinelRef} className="h-1" />
        </li>
      ) : null}
    </ul>
  );
}
