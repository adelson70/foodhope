import { cn } from '../../lib/cn';
import { formatarMoeda } from '../../lib/currency';
import type { VariacaoProduto } from '../../services/types';

type HomeProdutoVariacoesProps = {
  variacoes: VariacaoProduto[];
  selecionadaId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
};

export function HomeProdutoVariacoes({
  variacoes,
  selecionadaId,
  onSelect,
  disabled = false,
}: HomeProdutoVariacoesProps) {
  if (variacoes.length === 0) return null;

  const precosDiferentes = new Set(variacoes.map((item) => Number(item.preco))).size > 1;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-subtitle-md text-on-surface">Escolha uma opção</p>
      <div role="radiogroup" aria-label="Variações" className="flex flex-wrap gap-2">
        {variacoes.map((variacao) => {
          const ativa = variacao.id === selecionadaId;
          return (
            <button
              key={variacao.id}
              type="button"
              role="radio"
              aria-checked={ativa}
              disabled={disabled}
              onClick={() => onSelect(variacao.id)}
              className={cn(
                'min-h-10 rounded-full px-4 py-2 text-caption font-medium transition-colors disabled:cursor-not-allowed',
                ativa
                  ? 'bg-primary text-on-primary shadow-card'
                  : 'border border-operator-border bg-operator-card text-on-surface',
              )}
            >
              {variacao.nome}
              {precosDiferentes ? ` · ${formatarMoeda(Number(variacao.preco))}` : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}
