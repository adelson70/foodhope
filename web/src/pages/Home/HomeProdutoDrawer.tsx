import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

import { Button, Drawer, Textarea } from '../../components/ui';
import { formatarMoeda } from '../../lib/currency';
import { urlImagemProduto } from '../../lib/produtoImagem';
import type { Produto } from '../../services/types';
import { useCarrinhoStore } from '../../stores/carrinho.store';
import {
  HomeProdutoAdicionais,
  type AdicionalDraft,
} from './HomeProdutoAdicionais';

type HomeProdutoDrawerProps = {
  produto: Produto | null;
  open: boolean;
  onClose: () => void;
};

export function HomeProdutoDrawer({
  produto,
  open,
  onClose,
}: HomeProdutoDrawerProps) {
  const addItem = useCarrinhoStore((state) => state.addItem);
  const [qtd, setQtd] = useState(1);
  const [adicionais, setAdicionais] = useState<AdicionalDraft[]>([]);
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    if (!open) return;
    setQtd(1);
    setAdicionais([]);
    setObservacao('');
  }, [open, produto?.id]);

  const imagem = urlImagemProduto(produto?.imagemUrl);
  const adicionaisDisponiveis = produto?.adicionais ?? [];

  const totalPreview = useMemo(() => {
    if (!produto) return 0;
    const base = Number(produto.preco) * qtd;
    const extras = adicionais.reduce(
      (soma, item) => soma + item.preco * item.qtd,
      0,
    );
    return base + extras;
  }, [produto, qtd, adicionais]);

  function resetDraft() {
    setQtd(1);
    setAdicionais([]);
    setObservacao('');
  }

  function handleClose() {
    resetDraft();
    onClose();
  }

  function addAdicional(adicional: {
    id: string;
    nome: string;
    preco: string | number;
  }) {
    setAdicionais((atual) => {
      if (atual.some((item) => item.id === adicional.id)) return atual;
      return [
        ...atual,
        {
          id: adicional.id,
          nome: adicional.nome,
          preco: Number(adicional.preco),
          qtd: 1,
        },
      ];
    });
  }

  function setAdicionalQtd(id: string, nextQtd: number) {
    if (nextQtd < 1) {
      setAdicionais((atual) => atual.filter((item) => item.id !== id));
      return;
    }
    setAdicionais((atual) =>
      atual.map((item) => (item.id === id ? { ...item, qtd: nextQtd } : item)),
    );
  }

  function handleAdd() {
    if (!produto) return;
    addItem({
      produtoId: produto.id,
      nome: produto.nome,
      preco: Number(produto.preco),
      qtd,
      adicionais,
      observacao: observacao.trim() || undefined,
    });
    handleClose();
  }

  return (
    <Drawer
      open={open && Boolean(produto)}
      title={produto?.nome ?? 'Produto'}
      onClose={handleClose}
      footer={
        <Button type="button" fullWidth onClick={handleAdd} disabled={!produto}>
          Adicionar · {formatarMoeda(totalPreview)}
        </Button>
      }
    >
      {produto ? (
        <div className="flex flex-col gap-4">
          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-operator-bg">
            {imagem ? (
              <img
                src={imagem}
                alt={produto.nome}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-caption text-on-surface-variant">
                Sem foto
              </div>
            )}
          </div>

          {produto.descricao ? (
            <p className="text-caption text-on-surface-variant">
              {produto.descricao}
            </p>
          ) : null}

          <p className="text-title-md text-primary">
            {formatarMoeda(Number(produto.preco))}
          </p>

          <div className="flex items-center justify-between rounded-xl border border-operator-border bg-operator-card px-3 py-2">
            <span className="text-subtitle-md text-on-surface">Quantidade</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="size-10 px-0 py-0"
                aria-label="Diminuir quantidade"
                onClick={() => setQtd((atual) => Math.max(1, atual - 1))}
              >
                <Minus size={18} />
              </Button>
              <span className="min-w-8 text-center text-body-md text-on-surface">
                {qtd}
              </span>
              <Button
                type="button"
                variant="secondary"
                className="size-10 px-0 py-0"
                aria-label="Aumentar quantidade"
                onClick={() => setQtd((atual) => atual + 1)}
              >
                <Plus size={18} />
              </Button>
            </div>
          </div>

          <HomeProdutoAdicionais
            disponiveis={adicionaisDisponiveis}
            selecionados={adicionais}
            onAdd={addAdicional}
            onChangeQtd={setAdicionalQtd}
          />

          <div className="flex flex-col gap-2">
            <label
              htmlFor="home-produto-obs"
              className="text-subtitle-md text-on-surface"
            >
              Observação
            </label>
            <Textarea
              id="home-produto-obs"
              value={observacao}
              maxLength={140}
              placeholder="Ex.: sem cebola"
              onChange={(event) => setObservacao(event.target.value)}
            />
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
