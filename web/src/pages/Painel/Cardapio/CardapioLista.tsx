import type { Ref } from 'react';

import type { Produto } from '../../../services/types';
import { ProdutoCard } from './ProdutoCard';
import { ProdutoCardSkeleton } from './ProdutoCardSkeleton';

export const CARDAPIO_CATEGORIA_OUTROS = '__outros__';

type CardapioListaProps = {
  produtos: Produto[];
  loading: boolean;
  loadingMore: boolean;
  pending: boolean;
  hasNextPage: boolean;
  erro: string | null;
  buscaAtiva: boolean;
  busyId?: string | null;
  sentinelRef: Ref<HTMLDivElement>;
  onMoveUp?: (produto: Produto) => void;
  onMoveDown?: (produto: Produto) => void;
  onEdit: (produto: Produto) => void;
  onDelete: (produto: Produto) => void;
};

const SKELETON_COUNT = 4;
const LOAD_MORE_SKELETON_COUNT = 2;

function chaveGrupo(produto: Produto) {
  return produto.categoria?.id ?? CARDAPIO_CATEGORIA_OUTROS;
}

function tituloGrupo(produto: Produto) {
  return produto.categoria?.nome ?? 'Outros';
}

export function CardapioLista({
  produtos,
  loading,
  loadingMore,
  pending,
  hasNextPage,
  erro,
  buscaAtiva,
  busyId,
  sentinelRef,
  onMoveUp,
  onMoveDown,
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
      {produtos.map((produto, index) => {
        const grupo = chaveGrupo(produto);
        const anterior = index > 0 ? produtos[index - 1] : null;
        const proximo = index < produtos.length - 1 ? produtos[index + 1] : null;
        const mostrarDivisor =
          !buscaAtiva && (!anterior || chaveGrupo(anterior) !== grupo);
        const canMoveUp = Boolean(
          !buscaAtiva && anterior && chaveGrupo(anterior) === grupo,
        );
        const canMoveDown = Boolean(
          !buscaAtiva && proximo && chaveGrupo(proximo) === grupo,
        );

        return (
          <li key={produto.id} className="flex flex-col gap-3">
            {mostrarDivisor ? (
              <div
                className={
                  index === 0
                    ? 'pt-1'
                    : 'mt-2 border-t border-outline-variant/60 pt-4'
                }
              >
                <h2 className="text-subtitle-md font-semibold uppercase tracking-wide text-on-surface-variant">
                  {tituloGrupo(produto)}
                </h2>
              </div>
            ) : null}
            <ProdutoCard
              produto={produto}
              busy={busyId === produto.id}
              canMoveUp={canMoveUp}
              canMoveDown={canMoveDown}
              onMoveUp={buscaAtiva ? undefined : onMoveUp}
              onMoveDown={buscaAtiva ? undefined : onMoveDown}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </li>
        );
      })}
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
