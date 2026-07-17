import { Minus, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '../../components/ui';
import { formatarMoeda } from '../../lib/currency';
import {
  totalItemCarrinho,
  useCarrinhoStore,
  type CarrinhoItem,
} from '../../stores/carrinho.store';

type CarrinhoListaProps = {
  itens: CarrinhoItem[];
};

export function CarrinhoLista({ itens }: CarrinhoListaProps) {
  const setQtd = useCarrinhoStore((state) => state.setQtd);
  const removeItem = useCarrinhoStore((state) => state.removeItem);

  if (itens.length === 0) {
    return (
      <div className="rounded-xl border border-operator-border bg-operator-card px-4 py-8 text-center">
        <p className="text-body-md text-on-surface-variant">
          Seu carrinho está vazio.
        </p>
        <Link
          to="/"
          className="mt-3 inline-block text-caption text-primary underline-offset-2 hover:underline"
        >
          Ver cardápio
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {itens.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-operator-border bg-operator-card p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-subtitle-md text-on-surface">{item.nome}</p>
              {item.adicionais.length > 0 ? (
                <p className="mt-1 text-caption text-on-surface-variant">
                  {item.adicionais
                    .map((adic) => `${adic.nome} ×${adic.qtd}`)
                    .join(', ')}
                </p>
              ) : null}
              {item.observacao ? (
                <p className="mt-1 text-caption text-on-surface-variant">
                  Obs.: {item.observacao}
                </p>
              ) : null}
              <p className="mt-2 text-body-md font-medium text-primary">
                {formatarMoeda(totalItemCarrinho(item))}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="size-10 shrink-0 px-0 py-0 text-danger"
              aria-label={`Remover ${item.nome}`}
              onClick={() => removeItem(item.id)}
            >
              <Trash2 size={18} />
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="size-10 px-0 py-0"
              aria-label={`Diminuir ${item.nome}`}
              onClick={() => setQtd(item.id, item.qtd - 1)}
            >
              <Minus size={18} />
            </Button>
            <span className="min-w-8 text-center text-body-md text-on-surface">
              {item.qtd}
            </span>
            <Button
              type="button"
              variant="secondary"
              className="size-10 px-0 py-0"
              aria-label={`Aumentar ${item.nome}`}
              onClick={() => setQtd(item.id, item.qtd + 1)}
            >
              <Plus size={18} />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
