import type { RefObject } from 'react';

import type { Produto } from '../../../services/types';
import { ProdutoCard } from './ProdutoCard';
import { ProdutoCardSkeleton } from './ProdutoCardSkeleton';

type CardapioListaProps = {
  produtos: Produto[];
  loading: boolean;
  loadingMore: boolean;
  pending: boolean;
  hasNextPage: boolean;
  erro: string | null;
  buscaAtiva: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onEdit: (produto: Produto) => void;
  onDelete: (produto: Produto) => void;
};

const SKELETON_COUNT = 4;
const LOAD_MORE_SKELETON_COUNT = 2;

export function CardapioLista({
  produtos,
  loading,
  loadingMore,
  pending,
  hasNextPage,
  erro,
  buscaAtiva,
  sentinelRef,
  onEdit,
  onDelete,
}: CardapioListaProps) {
  if (loading) {
    return (
      <ul
        className="flex flex-col gap-3"
        aria-busy="true"
        aria-label="Carregando produtos"
      >
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <li key={index}>
            <ProdutoCardSkeleton />
          </li>
        ))}
      </ul>
    );
  }

  if (pending) {
    return (
      <div className="min-h-40" aria-busy="true" aria-label="Carregando produtos" />
    );
  }

  if (erro) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-caption text-danger">
        {erro}
      </div>
    );
  }

  if (produtos.length === 0) {
    return (
      <div className="rounded-xl border border-operator-border bg-operator-card px-4 py-8 text-center">
        <p className="text-body-md text-on-surface-variant">
          {buscaAtiva
            ? 'Nenhum produto encontrado para essa busca.'
            : 'Nenhum produto ainda.'}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {produtos.map((produto) => (
        <li key={produto.id}>
          <ProdutoCard
            produto={produto}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </li>
      ))}
      {loadingMore
        ? Array.from({ length: LOAD_MORE_SKELETON_COUNT }, (_, index) => (
            <li key={`more-${index}`}>
              <ProdutoCardSkeleton />
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
