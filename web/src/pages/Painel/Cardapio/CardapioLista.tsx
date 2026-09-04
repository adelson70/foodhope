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

type GrupoCardapio = {
  chave: string;
  titulo: string;
  itens: Produto[];
};

function agruparProdutos(produtos: Produto[]): GrupoCardapio[] {
  const grupos: GrupoCardapio[] = [];
  for (const produto of produtos) {
    const chave = chaveGrupo(produto);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.chave === chave) {
      ultimo.itens.push(produto);
    } else {
      grupos.push({
        chave,
        titulo: tituloGrupo(produto),
        itens: [produto],
      });
    }
  }
  return grupos;
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
        className="grid grid-cols-1 gap-3 lg:grid-cols-2"
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

  const grupos = buscaAtiva
    ? [{ chave: 'busca', titulo: '', itens: produtos }]
    : agruparProdutos(produtos);

  return (
    <div className="flex flex-col gap-3">
      {grupos.map((grupo, grupoIndex) => (
        <section key={grupo.chave} className="flex flex-col gap-3">
          {grupo.titulo ? (
            <div
              className={
                grupoIndex === 0
                  ? 'pt-1'
                  : 'mt-2 border-t border-outline-variant/60 pt-4'
              }
            >
              <h2 className="text-subtitle-md font-semibold uppercase tracking-wide text-on-surface-variant">
                {grupo.titulo}
              </h2>
            </div>
          ) : null}
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {grupo.itens.map((produto, index) => {
              const canMoveUp = Boolean(!buscaAtiva && index > 0);
              const canMoveDown = Boolean(
                !buscaAtiva && index < grupo.itens.length - 1,
              );

              return (
                <li key={produto.id}>
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
          </ul>
        </section>
      ))}
      {loadingMore ? (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Array.from({ length: LOAD_MORE_SKELETON_COUNT }, (_, index) => (
            <li key={`more-${index}`}>
              <ProdutoCardSkeleton />
            </li>
          ))}
        </ul>
      ) : null}
      {hasNextPage ? (
        <div ref={sentinelRef} className="h-1" aria-hidden />
      ) : null}
    </div>
  );
}
