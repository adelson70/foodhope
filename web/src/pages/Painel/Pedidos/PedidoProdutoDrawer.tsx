import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Minus, Plus, Search } from 'lucide-react';

import {
  Button,
  Drawer,
  Input,
  Loading,
  Textarea,
} from '../../../components/ui';
import {
  HomeProdutoAdicionais,
  type AdicionalDraft,
} from '../../Home/HomeProdutoAdicionais';
import { HomeProdutoRetirar } from '../../Home/HomeProdutoRetirar';
import type { Produto } from '../../../services/types';
import { formatarMoeda } from './pedidoTotais';

export type PedidoProdutoItemDraft = {
  produtoId: string;
  qtd: number;
  adicional?: { id: string; qtd: number }[];
  retirar?: string[];
  observacao?: string;
};

type PedidoProdutoDrawerProps = {
  open: boolean;
  onClose: () => void;
  produtos: Produto[];
  loading?: boolean;
  erro?: string | null;
  onAdd: (item: PedidoProdutoItemDraft) => void;
};

export function PedidoProdutoDrawer({
  open,
  onClose,
  produtos,
  loading = false,
  erro = null,
  onAdd,
}: PedidoProdutoDrawerProps) {
  const [busca, setBusca] = useState('');
  const [produto, setProduto] = useState<Produto | null>(null);
  const [qtd, setQtd] = useState(1);
  const [adicionais, setAdicionais] = useState<AdicionalDraft[]>([]);
  const [retirarIds, setRetirarIds] = useState<string[]>([]);
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    if (!open) return;
    setBusca('');
    setProduto(null);
    setQtd(1);
    setAdicionais([]);
    setRetirarIds([]);
    setObservacao('');
  }, [open]);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const ativos = produtos.filter((item) => item.ativo !== false);
    if (!termo) return ativos;
    return ativos.filter((item) => item.nome.toLowerCase().includes(termo));
  }, [produtos, busca]);

  const adicionaisDisponiveis = useMemo(
    () => (produto?.adicionais ?? []).filter((item) => item.ativo !== false),
    [produto],
  );

  const ingredientesDisponiveis = produto?.ingredientes ?? [];

  const totalPreview = useMemo(() => {
    if (!produto) return 0;
    const base = Number(produto.preco) * qtd;
    const extras = adicionais.reduce(
      (soma, item) => soma + item.preco * item.qtd,
      0,
    );
    return base + extras;
  }, [produto, qtd, adicionais]);

  function resetProdutoDraft() {
    setQtd(1);
    setAdicionais([]);
    setRetirarIds([]);
    setObservacao('');
  }

  function handleClose() {
    setProduto(null);
    resetProdutoDraft();
    setBusca('');
    onClose();
  }

  function handleVoltarLista() {
    setProduto(null);
    resetProdutoDraft();
  }

  function handleEscolherProduto(next: Produto) {
    setProduto(next);
    resetProdutoDraft();
  }

  function addAdicional(adicional: {
    id: string;
    nome: string;
    preco: string | number;
    ativo?: boolean;
  }) {
    if (adicional.ativo === false) return;
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

  function toggleRetirar(id: string) {
    setRetirarIds((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id],
    );
  }

  function handleAdd() {
    if (!produto) return;
    onAdd({
      produtoId: produto.id,
      qtd,
      adicional:
        adicionais.length > 0
          ? adicionais.map(({ id, qtd: adicionalQtd }) => ({
              id,
              qtd: adicionalQtd,
            }))
          : undefined,
      retirar: retirarIds.length > 0 ? retirarIds : undefined,
      observacao: observacao.trim() || undefined,
    });
    handleClose();
  }

  const noProduto = !produto;

  return (
    <Drawer
      open={open}
      title={produto?.nome ?? 'Escolher produto'}
      onClose={handleClose}
      footer={
        produto ? (
          <Button type="button" fullWidth onClick={handleAdd}>
            Adicionar · {formatarMoeda(totalPreview)}
          </Button>
        ) : null
      }
    >
      {noProduto ? (
        <div className="flex flex-col gap-4">
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar produto…"
            aria-label="Buscar produto"
            leftIcon={<Search size={17} strokeWidth={1.75} />}
          />

          {loading ? (
            <Loading
              className="min-h-16 py-0"
              dotClassName="size-6"
              label="Carregando produtos"
            />
          ) : null}

          {erro ? <p className="text-caption text-danger">{erro}</p> : null}

          {!loading && !erro ? (
            produtosFiltrados.length === 0 ? (
              <p className="text-caption text-on-surface-variant">
                Nenhum produto encontrado.
              </p>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-operator-border bg-operator-card">
                {produtosFiltrados.map((item, index) => (
                  <li
                    key={item.id}
                    className={
                      index > 0 ? 'border-t border-operator-border' : undefined
                    }
                  >
                    <button
                      type="button"
                      className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-primary-container/10 active:bg-primary-container/15"
                      onClick={() => handleEscolherProduto(item)}
                    >
                      <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">
                        {item.nome}
                      </span>
                      <span className="shrink-0 text-caption text-on-surface-variant">
                        {formatarMoeda(Number(item.preco))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            className="flex w-fit items-center gap-1 text-caption text-on-surface-variant transition-colors hover:text-on-surface"
            onClick={handleVoltarLista}
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
            Trocar produto
          </button>

          <p className="text-title-md text-primary">
            {formatarMoeda(Number(produto.preco))}
          </p>

          {produto.descricao ? (
            <p className="text-caption text-on-surface-variant">
              {produto.descricao}
            </p>
          ) : null}

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
                <Minus size={15} />
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
                <Plus size={15} />
              </Button>
            </div>
          </div>

          <HomeProdutoAdicionais
            disponiveis={adicionaisDisponiveis}
            selecionados={adicionais}
            onAdd={addAdicional}
            onChangeQtd={setAdicionalQtd}
          />

          <HomeProdutoRetirar
            disponiveis={ingredientesDisponiveis}
            selecionados={retirarIds}
            onToggle={toggleRetirar}
          />

          <div className="flex flex-col gap-2">
            <label
              htmlFor="pedido-produto-obs"
              className="text-subtitle-md text-on-surface"
            >
              Observação
            </label>
            <Textarea
              id="pedido-produto-obs"
              value={observacao}
              maxLength={140}
              placeholder="Ex.: bem passado"
              onChange={(event) => setObservacao(event.target.value)}
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}
