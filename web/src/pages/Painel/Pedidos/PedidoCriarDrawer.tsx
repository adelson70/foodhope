import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';

import {
  Button,
  Drawer,
  Input,
  Label,
  PagoToggle,
  TipoConsumoToggle,
} from '../../../components/ui';
import { TIPO_CONSUMO_PADRAO } from '../../../lib/tipoConsumo';
import { STATUS_PAGAMENTO_PADRAO } from '../../../lib/statusPagamento';
import {
  criarPedidoSchema,
  type CriarPedidoFormValues,
} from '../../../schemas/criar-pedido.schema';
import {
  getApiErrorMensagens,
  produtoService,
} from '../../../services';
import { criarPedidoComOutbox } from '../../../lib/criarPedidoComOutbox';
import {
  obterCardapioOperador,
  salvarCardapioOperador,
} from '../../../lib/cardapioOperador';
import { isNetworkFailure } from '../../../lib/network';
import type {
  Pedido,
  Produto,
  StatusPagamento,
  TipoConsumo,
} from '../../../services/types';
import { formatarMoeda } from './pedidoTotais';
import {
  PedidoProdutoDrawer,
  type PedidoProdutoItemDraft,
} from './PedidoProdutoDrawer';
import { rotuloRetiradas } from '../../../lib/retiradaPedido';

type PedidoCriarDrawerProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (pedido: Pedido) => void;
  onQueued?: (clientRequestId: string) => void;
};

export function PedidoCriarDrawer({
  open,
  onClose,
  onCreated,
  onQueued,
}: PedidoCriarDrawerProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtosLoading, setProdutosLoading] = useState(false);
  const [produtosErro, setProdutosErro] = useState<string | null>(null);
  const [produtoDrawerOpen, setProdutoDrawerOpen] = useState(false);
  const [tipoConsumo, setTipoConsumo] = useState<TipoConsumo>(
    TIPO_CONSUMO_PADRAO,
  );
  const [statusPagamento, setStatusPagamento] = useState<StatusPagamento>(
    STATUS_PAGAMENTO_PADRAO,
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CriarPedidoFormValues>({
    resolver: zodResolver(criarPedidoSchema),
    defaultValues: {
      cliente: { primeiro_nome: '', sobrenome: '' },
      itens: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'itens',
  });

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setProdutosLoading(true);
    setProdutosErro(null);

    produtoService
      .listar({ limit: 100 })
      .then(async (response) => {
        if (cancelled) return;
        if (!response.sucesso || !response.dados) {
          const cache = await obterCardapioOperador();
          if (cache?.produtos?.length) {
            setProdutos(cache.produtos);
            setProdutosErro(null);
            return;
          }
          setProdutosErro('Não foi possível carregar o cardápio.');
          setProdutos([]);
          return;
        }
        const lista = response.dados.data ?? [];
        setProdutos(lista);
        void salvarCardapioOperador(lista);
      })
      .catch(async (error: unknown) => {
        if (cancelled) return;
        const cache = await obterCardapioOperador();
        if (cache?.produtos?.length && isNetworkFailure(error)) {
          setProdutos(cache.produtos);
          setProdutosErro(null);
          return;
        }
        if (cache?.produtos?.length) {
          setProdutos(cache.produtos);
          setProdutosErro(null);
          return;
        }
        const mensagens = getApiErrorMensagens(error);
        setProdutosErro(
          mensagens[0] ??
            'Abra online uma vez para sincronizar o cardápio.',
        );
        setProdutos([]);
      })
      .finally(() => {
        if (!cancelled) setProdutosLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      reset({
        cliente: { primeiro_nome: '', sobrenome: '' },
        itens: [],
      });
      setProdutoDrawerOpen(false);
      setTipoConsumo(TIPO_CONSUMO_PADRAO);
      setStatusPagamento(STATUS_PAGAMENTO_PADRAO);
    }
  }, [open, reset]);

  function totalItemDraft(field: {
    produtoId: string;
    qtd: number;
    adicional?: { id: string; qtd: number }[];
  }) {
    const produto = produtos.find((p) => p.id === field.produtoId);
    if (!produto) return 0;
    const base = Number(produto.preco) * field.qtd;
    const extras = (field.adicional ?? []).reduce((acc, adic) => {
      const info = produto.adicionais?.find((a) => a.id === adic.id);
      return acc + (info ? Number(info.preco) * adic.qtd : 0);
    }, 0);
    return base + extras;
  }

  function nomesAdicionais(field: {
    produtoId: string;
    adicional?: { id: string; qtd: number }[];
  }) {
    const produto = produtos.find((p) => p.id === field.produtoId);
    if (!produto || !field.adicional?.length) return [];
    return field.adicional.map((adic) => {
      const info = produto.adicionais?.find((a) => a.id === adic.id);
      return {
        nome: info?.nome ?? 'Adicional',
        qtd: adic.qtd,
        preco: info ? Number(info.preco) * adic.qtd : 0,
      };
    });
  }

  function nomesRetiradas(field: {
    produtoId: string;
    retirar?: string[];
  }) {
    const produto = produtos.find((p) => p.id === field.produtoId);
    if (!produto || !field.retirar?.length) return [];
    return field.retirar.map((id) => {
      const info = produto.ingredientes?.find((item) => item.id === id);
      return info?.nome ?? 'Ingrediente';
    });
  }

  const total = useMemo(
    () => fields.reduce((soma, field) => soma + totalItemDraft(field), 0),
    [fields, produtos],
  );

  function handleAddItem(item: PedidoProdutoItemDraft) {
    append(item);
  }

  function handleClose() {
    if (produtoDrawerOpen) {
      setProdutoDrawerOpen(false);
      return;
    }
    onClose();
  }

  async function onSubmit(values: CriarPedidoFormValues) {
    try {
      const sobrenome = values.cliente.sobrenome?.trim() || undefined;
      const nomeCompleto = [values.cliente.primeiro_nome, sobrenome]
        .filter(Boolean)
        .join(' ');

      const itensPayload = values.itens.map(
        ({ produtoId, qtd, adicional, retirar, observacao }) => ({
          id: produtoId,
          qtd,
          adicional,
          retirar,
          observacao,
        }),
      );

      const result = await criarPedidoComOutbox(
        {
          tipo_consumo: tipoConsumo,
          status_pagamento: statusPagamento,
          cliente: {
            primeiro_nome: values.cliente.primeiro_nome,
            ...(sobrenome ? { sobrenome } : {}),
          },
          itens: itensPayload,
        },
        {
          origem: 'painel',
          snapshot: {
            nome_completo: nomeCompleto,
            tipo_consumo: tipoConsumo,
            status_pagamento: statusPagamento,
            totalEstimado: total,
            itens: values.itens.map((item) => ({
              nome: nomeProduto(item.produtoId),
              qtd: item.qtd,
            })),
          },
        },
      );

      if (result.kind === 'created') {
        onCreated(result.pedido);
        onClose();
        return;
      }

      onQueued?.(result.clientRequestId);
      onClose();
    } catch {
      return;
    }
  }

  function nomeProduto(id: string) {
    return produtos.find((p) => p.id === id)?.nome ?? 'Produto';
  }

  return (
    <>
      <Drawer
        open={open}
        title="Novo pedido"
        onClose={handleClose}
        footer={
          <div className="flex flex-col gap-3">
            {fields.length > 0 ? (
              <div className="flex items-center justify-between rounded-xl border border-operator-border bg-operator-card px-4 py-3">
                <span className="text-subtitle-md text-on-surface">Total</span>
                <span className="text-title-md text-primary">
                  {formatarMoeda(total)}
                </span>
              </div>
            ) : null}
            <Button
              type="submit"
              form="form-criar-pedido"
              variant="primary"
              fullWidth
              disabled={isSubmitting || fields.length === 0}
            >
              {isSubmitting ? 'Criando…' : 'Criar pedido'}
            </Button>
          </div>
        }
      >
        <form
          id="form-criar-pedido"
          className="flex flex-col gap-6"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <section className="flex flex-col gap-3">
            <h3 className="text-subtitle-md font-medium text-on-surface">
              Consumo
            </h3>
            <TipoConsumoToggle value={tipoConsumo} onChange={setTipoConsumo} />
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-subtitle-md font-medium text-on-surface">
              Pagamento
            </h3>
            <PagoToggle
              value={statusPagamento}
              onChange={setStatusPagamento}
            />
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-subtitle-md font-medium text-on-surface">
              Cliente
            </h3>
            <div className="space-y-2">
              <Label htmlFor="primeiro_nome">Nome</Label>
              <Input
                id="primeiro_nome"
                placeholder="Primeiro nome"
                error={Boolean(errors.cliente?.primeiro_nome)}
                {...register('cliente.primeiro_nome')}
              />
              {errors.cliente?.primeiro_nome ? (
                <p className="px-1 text-caption text-danger">
                  {errors.cliente.primeiro_nome.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sobrenome">Sobrenome</Label>
              <Input
                id="sobrenome"
                placeholder="Sobrenome"
                error={Boolean(errors.cliente?.sobrenome)}
                {...register('cliente.sobrenome')}
              />
              {errors.cliente?.sobrenome ? (
                <p className="px-1 text-caption text-danger">
                  {errors.cliente.sobrenome.message}
                </p>
              ) : null}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-subtitle-md font-medium text-on-surface">
              Itens do pedido
            </h3>
            {errors.itens?.root || errors.itens?.message ? (
              <p className="text-caption text-danger">
                {errors.itens.root?.message ?? errors.itens.message}
              </p>
            ) : null}
            {fields.length === 0 ? (
              <p className="text-caption text-on-surface-variant">
                Nenhum item adicionado.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {fields.map((field, index) => {
                  const adicionais = nomesAdicionais(field);
                  const retiradas = nomesRetiradas(field);
                  return (
                    <li
                      key={field.id}
                      className="rounded-xl border border-operator-border bg-operator-card px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-body-md text-on-surface">
                              {field.qtd}× {nomeProduto(field.produtoId)}
                            </p>
                            <p className="shrink-0 text-body-md font-medium text-primary">
                              {formatarMoeda(totalItemDraft(field))}
                            </p>
                          </div>
                          {adicionais.length > 0 ? (
                            <ul className="mt-1 flex flex-col gap-0.5">
                              {adicionais.map((adic, adicIndex) => (
                                <li
                                  key={`${field.id}-adic-${adicIndex}`}
                                  className="text-caption text-on-surface-variant"
                                >
                                  + {adic.qtd}× {adic.nome}
                                  {adic.preco > 0
                                    ? ` (${formatarMoeda(adic.preco)})`
                                    : ''}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {retiradas.length > 0 ? (
                            <p className="mt-1 text-caption text-on-surface-variant">
                              {rotuloRetiradas(
                                retiradas.map((nome) => ({ nome })),
                              )}
                            </p>
                          ) : null}
                          {field.observacao ? (
                            <p className="mt-1 text-caption text-on-surface-variant">
                              Obs.: {field.observacao}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="dangerGhost"
                          className="size-10 shrink-0 px-0 py-0"
                          aria-label="Remover item"
                          onClick={() => remove(index)}
                        >
                          <Trash2 size={15} strokeWidth={1.75} />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <Button
              type="button"
              variant="secondary"
              fullWidth
              className="gap-2"
              onClick={() => setProdutoDrawerOpen(true)}
            >
              <Plus size={16} strokeWidth={1.75} />
              Adicionar produto
            </Button>
          </section>
        </form>
      </Drawer>

      <PedidoProdutoDrawer
        open={produtoDrawerOpen}
        onClose={() => setProdutoDrawerOpen(false)}
        produtos={produtos}
        loading={produtosLoading}
        erro={produtosErro}
        onAdd={handleAddItem}
      />
    </>
  );
}
