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
      className="flex w-full items-center gap-3 rounded-xl bg-surface-container-low p-2 text-left shadow-card transition-colors active:bg-surface-container-high"
    >
      <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-surface-container-lowest">
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
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="truncate text-subtitle-md text-on-surface">
            {produto.nome}
          </h2>
          <span className="shrink-0 text-subtitle-md text-primary">
            {formatarMoeda(Number(produto.preco))}
          </span>
        </div>
        {produto.descricao ? (
          <p className="mt-0.5 line-clamp-1 text-caption text-on-surface-variant">
            {produto.descricao}
          </p>
        ) : null}
      </div>
    </button>
  );
}
