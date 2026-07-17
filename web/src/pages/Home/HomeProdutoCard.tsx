import { formatarMoeda } from '../../lib/currency';
import { urlImagemProduto } from '../../lib/produtoImagem';
import type { Produto } from '../../services/types';

type HomeProdutoCardProps = {
  produto: Produto;
  onSelect: (produto: Produto) => void;
};

export function HomeProdutoCard({ produto, onSelect }: HomeProdutoCardProps) {
  const imagem = urlImagemProduto(produto.imagemUrl);

  return (
    <button
      type="button"
      onClick={() => onSelect(produto)}
      className="w-full overflow-hidden rounded-xl border border-operator-border bg-operator-card text-left transition-colors hover:border-primary-container/40"
    >
      <div className="flex gap-3 p-3">
        <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-operator-bg">
          {imagem ? (
            <img
              src={imagem}
              alt=""
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-caption text-on-surface-variant">
              Sem foto
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <h2 className="truncate text-subtitle-md text-on-surface">
            {produto.nome}
          </h2>
          {produto.descricao ? (
            <p className="mt-1 line-clamp-2 text-caption text-on-surface-variant">
              {produto.descricao}
            </p>
          ) : null}
          <p className="mt-2 text-body-md font-semibold text-primary">
            {formatarMoeda(Number(produto.preco))}
          </p>
        </div>
      </div>
    </button>
  );
}
