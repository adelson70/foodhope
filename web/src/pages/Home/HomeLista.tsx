import type { RefObject } from 'react';

import type { Produto } from '../../services/types';
import {
  HOME_CATEGORIA_OUTROS,
  homeCategoriaAnchorId,
} from './HomeCategoriaPills';
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

function chaveCategoria(produto: Produto) {
  return produto.categoria?.id ?? HOME_CATEGORIA_OUTROS;
}

function tituloCategoria(produto: Produto) {
  return produto.categoria?.nome ?? 'Outros';
}

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
      {produtos.map((produto, index) => {
        const anterior = index > 0 ? produtos[index - 1] : null;
        const chave = chaveCategoria(produto);
        const mostrarDivisor =
          !anterior || chaveCategoria(anterior) !== chave;

        return (
          <li key={produto.id} className="flex flex-col gap-3">
            {mostrarDivisor ? (
              <div
                id={homeCategoriaAnchorId(chave)}
                data-home-categoria={chave}
                className={
                  index === 0
                    ? 'scroll-mt-36 pt-1'
                    : 'mt-2 scroll-mt-36 border-t border-outline-variant/60 pt-4'
                }
              >
                <h2 className="text-subtitle-md font-semibold uppercase tracking-wide text-on-surface-variant">
                  {tituloCategoria(produto)}
                </h2>
              </div>
            ) : null}
            <HomeProdutoCard produto={produto} onSelect={onSelect} />
          </li>
        );
      })}
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
