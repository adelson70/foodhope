import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

import { Button, Drawer, Textarea } from '../../components/ui';
import { formatarMoeda } from '../../lib/currency';
import { urlImagemProduto } from '../../lib/produtoImagem';
import {
  imagemVariacaoOuProduto,
  nomeComVariacao,
  produtoVariavel,
  variacoesAtivas,
} from '../../lib/produtoVariacao';
import type { Produto } from '../../services/types';
import { useCarrinhoStore } from '../../stores/carrinho.store';
import {
  HomeProdutoAdicionais,
  type AdicionalDraft,
} from './HomeProdutoAdicionais';
import { HomeProdutoRetirar } from './HomeProdutoRetirar';
import { HomeProdutoVariacoes } from './HomeProdutoVariacoes';

type HomeProdutoDrawerProps = {
  produto: Produto | null;
  open: boolean;
  onClose: () => void;
  lojaFechada?: boolean;
};

export function HomeProdutoDrawer({
  produto,
  open,
  onClose,
  lojaFechada = false,
}: HomeProdutoDrawerProps) {
  const addItem = useCarrinhoStore((state) => state.addItem);
  const [qtd, setQtd] = useState(1);
  const [adicionais, setAdicionais] = useState<AdicionalDraft[]>([]);
  const [retirarIds, setRetirarIds] = useState<string[]>([]);
  const [observacao, setObservacao] = useState('');
  const [variacaoId, setVariacaoId] = useState<string | null>(null);

  const variavel = produtoVariavel(produto);
  const variacoesDisponiveis = useMemo(() => variacoesAtivas(produto), [produto]);
  // Sem escolha (ou escolha que ficou indisponível) → primeira variação ativa.
  const variacao =
    variacoesDisponiveis.find((item) => item.id === variacaoId) ??
    variacoesDisponiveis[0] ??
    null;

  useEffect(() => {
    if (!open) return;
    setVariacaoId(null);
    setQtd(1);
    setAdicionais([]);
    setRetirarIds([]);
    setObservacao('');
  }, [open, produto?.id]);

  useEffect(() => {
    if (!produto) return;
    setAdicionais((atual) =>
      atual.filter((item) => {
        const disponivel = produto.adicionais?.find((a) => a.id === item.id);
        return disponivel && disponivel.ativo !== false;
      }),
    );
    setRetirarIds((atual) =>
      atual.filter((id) =>
        (produto.ingredientes ?? []).some((item) => item.id === id),
      ),
    );
  }, [produto]);

  const imagemAtual = produto ? imagemVariacaoOuProduto(produto, variacao) : null;
  const imagem = urlImagemProduto(imagemAtual?.imagemUrl, imagemAtual?.cacheKey);
  const precoUnitario = variavel
    ? Number(variacao?.preco ?? 0)
    : Number(produto?.preco ?? 0);
  const adicionaisDisponiveis = produto?.adicionais ?? [];
  const ingredientesDisponiveis = produto?.ingredientes ?? [];
  const produtoIndisponivel =
    produto?.ativo === false || (variavel && variacoesDisponiveis.length === 0);
  const compraBloqueada = produtoIndisponivel || lojaFechada;

  const totalPreview = useMemo(() => {
    if (!produto) return 0;
    const base = precoUnitario * qtd;
    const extras = adicionais.reduce(
      (soma, item) => soma + item.preco * item.qtd,
      0,
    );
    return base + extras;
  }, [produto, precoUnitario, qtd, adicionais]);

  function resetDraft() {
    setQtd(1);
    setAdicionais([]);
    setRetirarIds([]);
    setObservacao('');
    setVariacaoId(null);
  }

  function handleClose() {
    resetDraft();
    onClose();
  }

  function addAdicional(adicional: {
    id: string;
    nome: string;
    preco: string | number;
    ativo?: boolean;
  }) {
    if (adicional.ativo === false || compraBloqueada) return;
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
    if (compraBloqueada) return;
    if (nextQtd < 1) {
      setAdicionais((atual) => atual.filter((item) => item.id !== id));
      return;
    }
    setAdicionais((atual) =>
      atual.map((item) => (item.id === id ? { ...item, qtd: nextQtd } : item)),
    );
  }

  function toggleRetirar(id: string) {
    if (compraBloqueada) return;
    setRetirarIds((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id],
    );
  }

  function handleAdd() {
    if (!produto || compraBloqueada) return;
    if (variavel && !variacao) return;
    const retirar = ingredientesDisponiveis
      .filter((item) => retirarIds.includes(item.id))
      .map((item) => ({ id: item.id, nome: item.nome }));
    addItem({
      produtoId: produto.id,
      variacaoId: variacao?.id,
      nome: nomeComVariacao(produto.nome, variacao?.nome),
      preco: precoUnitario,
      qtd,
      adicionais,
      retirar: retirar.length > 0 ? retirar : undefined,
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
        <Button
          type="button"
          fullWidth
          onClick={handleAdd}
          disabled={!produto || compraBloqueada || (variavel && !variacao)}
        >
          {lojaFechada
            ? 'Loja fechada'
            : produtoIndisponivel
              ? 'Fora de estoque'
              : `Adicionar · ${formatarMoeda(totalPreview)}`}
        </Button>
      }
    >
      {produto ? (
        <div
          className={
            compraBloqueada
              ? 'flex flex-col gap-4 opacity-50'
              : 'flex flex-col gap-4'
          }
        >
          <div className="relative aspect-square overflow-hidden rounded-xl bg-operator-bg">
            {imagem ? (
              <>
                <img
                  key={imagem}
                  src={imagem}
                  alt={produto.nome}
                  className="size-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-on-surface/45 px-2 py-1.5 text-center text-caption text-surface-container-low">
                  Imagem meramente ilustrativa
                </p>
              </>
            ) : (
              <div className="flex size-full items-center justify-center text-caption text-on-surface-variant">
                Sem foto
              </div>
            )}
          </div>

          {lojaFechada ? (
            <p className="text-caption text-danger">Loja fechada</p>
          ) : produtoIndisponivel ? (
            <p className="text-caption text-danger">Fora de estoque</p>
          ) : null}

          {produto.descricao ? (
            <p className="text-caption text-on-surface-variant">
              {produto.descricao}
            </p>
          ) : null}

          <p className="text-title-md text-primary">
            {formatarMoeda(precoUnitario)}
          </p>

          {variavel ? (
            <HomeProdutoVariacoes
              variacoes={variacoesDisponiveis}
              selecionadaId={variacao?.id ?? null}
              onSelect={setVariacaoId}
              disabled={compraBloqueada}
            />
          ) : null}

          {!compraBloqueada ? (
            <div className="flex items-center justify-between rounded-xl border border-operator-border bg-operator-card px-3 py-2">
              <span className="text-subtitle-md text-on-surface">
                Quantidade
              </span>
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
          ) : null}

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
            disabled={compraBloqueada}
          />

          {!compraBloqueada ? (
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
                placeholder="Ex.: bem passado"
                onChange={(event) => setObservacao(event.target.value)}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}
