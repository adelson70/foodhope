import type { Produto } from '../../../services/types';
import { ProdutoCard } from './ProdutoCard';

type CardapioListaProps = {
  produtos: Produto[];
  loading: boolean;
  erro: string | null;
  buscaAtiva: boolean;
  onEdit: (produto: Produto) => void;
  onDelete: (produto: Produto) => void;
};

export function CardapioLista({
  produtos,
  loading,
  erro,
  buscaAtiva,
  onEdit,
  onDelete,
}: CardapioListaProps) {
  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <div
          className="size-8 animate-pulse rounded-full bg-primary-container/40"
          aria-label="Carregando produtos"
        />
      </div>
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
    </ul>
  );
}
