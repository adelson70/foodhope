import type { RefObject } from 'react';

import type { Produto } from '../../services/types';
import { HomeProdutoCard } from './HomeProdutoCard';
import { HomeProdutoCardSkeleton } from './HomeProdutoSkeleton';

type HomeListaProps = {
  produtos: Produto[];
  loadingMore: boolean;
  hasNextPage: boolean;
  erro: string | null;
  buscaAtiva: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onSelect: (produto: Produto) => void;
};

const LOAD_MORE_SKELETON_COUNT = 2;

export function HomeLista({
  produtos,
  loadingMore,
  hasNextPage,
  erro,
  buscaAtiva,
  sentinelRef,
  onSelect,
}: HomeListaProps) {
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
            : 'Cardápio vazio no momento.'}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {produtos.map((produto) => (
        <li key={produto.id}>
          <HomeProdutoCard produto={produto} onSelect={onSelect} />
        </li>
      ))}
      {loadingMore
        ? Array.from({ length: LOAD_MORE_SKELETON_COUNT }, (_, index) => (
            <li key={`more-${index}`}>
              <HomeProdutoCardSkeleton />
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
