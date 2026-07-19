import type { Ref } from 'react';

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
  sentinelRef: Ref<HTMLDivElement>;
  onSelect: (produto: Produto) => void;
};

type HomeSecao = {
  id: string;
  nome: string;
  produtos: Produto[];
};

const LOAD_MORE_SKELETON_COUNT = 2;

function chaveCategoria(produto: Produto) {
  return produto.categoria?.id ?? HOME_CATEGORIA_OUTROS;
}

function tituloCategoria(produto: Produto) {
  return produto.categoria?.nome ?? 'Outros';
}

function agruparPorCategoria(produtos: Produto[]): HomeSecao[] {
  const secoes: HomeSecao[] = [];

  for (const produto of produtos) {
    const id = chaveCategoria(produto);
    const ultima = secoes[secoes.length - 1];
    if (ultima && ultima.id === id) {
      ultima.produtos.push(produto);
      continue;
    }
    secoes.push({
      id,
      nome: tituloCategoria(produto),
      produtos: [produto],
    });
  }

  return secoes;
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

  const secoes = agruparPorCategoria(produtos);

  return (
    <div className="flex flex-col gap-6">
      {secoes.map((secao, index) => (
        <section
          key={secao.id}
          id={homeCategoriaAnchorId(secao.id)}
          data-home-categoria={secao.id}
          className={
            index === 0
              ? 'scroll-mt-36'
              : 'scroll-mt-36 border-t border-outline-variant/60 pt-4'
          }
        >
          <h2 className="mb-3 text-subtitle-md font-semibold uppercase tracking-wide text-on-surface-variant">
            {secao.nome}
          </h2>
          <ul className="flex flex-col gap-3">
            {secao.produtos.map((produto) => (
              <li key={produto.id}>
                <HomeProdutoCard produto={produto} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {loadingMore
        ? Array.from({ length: LOAD_MORE_SKELETON_COUNT }, (_, index) => (
            <div key={`more-${index}`}>
              <HomeProdutoCardSkeleton />
            </div>
          ))
        : null}
      {hasNextPage ? (
        <div aria-hidden>
          <div ref={sentinelRef} className="h-1" />
        </div>
      ) : null}
    </div>
  );
}
