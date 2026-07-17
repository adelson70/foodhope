import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Minus, Plus, Trash2 } from 'lucide-react';

import {
  Button,
  Drawer,
  Input,
  Label,
  PhoneInput,
  Select,
} from '../../../components/ui';
import {
  criarPedidoSchema,
  type CriarPedidoFormValues,
} from '../../../schemas/criar-pedido.schema';
import {
  getApiErrorMensagens,
  pedidoService,
  produtoService,
} from '../../../services';
import type { Pedido, Produto } from '../../../services/types';
import { onlyDigits } from '../../../lib/phone';
import { formatarMoeda } from './pedidoTotais';

type PedidoCriarDrawerProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (pedido: Pedido) => void;
};

type AdicionalDraft = {
  id: string;
  qtd: number;
};

export function PedidoCriarDrawer({
  open,
  onClose,
  onCreated,
}: PedidoCriarDrawerProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtosLoading, setProdutosLoading] = useState(false);
  const [produtosErro, setProdutosErro] = useState<string | null>(null);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [itemQtd, setItemQtd] = useState(1);
  const [adicionaisDraft, setAdicionaisDraft] = useState<AdicionalDraft[]>([]);
  const [observacaoDraft, setObservacaoDraft] = useState('');
  const [itemErro, setItemErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CriarPedidoFormValues>({
    resolver: zodResolver(criarPedidoSchema),
    defaultValues: {
      cliente: { primeiro_nome: '', sobrenome: '', contato: '', cidade: '' },
      itens: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'itens',
  });

  const produtoOptions = useMemo(
    () =>
      produtos
        .filter((produto) => produto.ativo !== false)
        .map((produto) => ({
          value: produto.id,
          label: produto.nome,
          description: formatarMoeda(Number(produto.preco)),
        })),
    [produtos],
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setProdutosLoading(true);
    setProdutosErro(null);

    produtoService
      .listar({ limit: 100 })
      .then((response) => {
        if (cancelled) return;
        if (!response.sucesso || !response.dados) {
          setProdutosErro('Não foi possível carregar o cardápio.');
          setProdutos([]);
          return;
        }
        setProdutos(response.dados.data ?? []);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const mensagens = getApiErrorMensagens(error);
        setProdutosErro(mensagens[0] ?? 'Não foi possível carregar o cardápio.');
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
        cliente: { primeiro_nome: '', sobrenome: '', contato: '', cidade: '' },
        itens: [],
      });
      setProdutoSelecionadoId('');
      setItemQtd(1);
      setAdicionaisDraft([]);
      setObservacaoDraft('');
      setItemErro(null);
    }
  }, [open, reset]);

  const produtoSelecionado = produtos.find((p) => p.id === produtoSelecionadoId);

  function toggleAdicional(adicionalId: string) {
    setAdicionaisDraft((atual) => {
      const existe = atual.find((a) => a.id === adicionalId);
      if (existe) {
        return atual.filter((a) => a.id !== adicionalId);
      }
      return [...atual, { id: adicionalId, qtd: 1 }];
    });
  }

  function setAdicionalQtd(adicionalId: string, qtd: number) {
    if (qtd < 1) return;
    setAdicionaisDraft((atual) =>
      atual.map((a) => (a.id === adicionalId ? { ...a, qtd } : a)),
    );
  }

  function handleAddItem() {
    if (!produtoSelecionadoId) {
      setItemErro('Selecione um produto.');
      return;
    }
    setItemErro(null);
    append({
      produtoId: produtoSelecionadoId,
      qtd: itemQtd,
      adicional: adicionaisDraft.length > 0 ? adicionaisDraft : undefined,
      observacao: observacaoDraft.trim() || undefined,
    });
    setProdutoSelecionadoId('');
    setItemQtd(1);
    setAdicionaisDraft([]);
    setObservacaoDraft('');
  }

  async function onSubmit(values: CriarPedidoFormValues) {
    try {
      const contatoDigits = values.cliente.contato
        ? onlyDigits(values.cliente.contato)
        : undefined;
      const sobrenome = values.cliente.sobrenome?.trim() || undefined;
      const cidade = values.cliente.cidade?.trim() || undefined;

      const response = await pedidoService.criar({
        cliente: {
          primeiro_nome: values.cliente.primeiro_nome,
          ...(sobrenome ? { sobrenome } : {}),
          ...(contatoDigits ? { contato: contatoDigits } : {}),
          ...(cidade ? { cidade } : {}),
        },
        itens: values.itens.map(({ produtoId, qtd, adicional, observacao }) => ({
          id: produtoId,
          qtd,
          adicional,
          observacao,
        })),
      });
      if (response.sucesso && response.dados?.pedido) {
        onCreated(response.dados.pedido);
        onClose();
      }
    } catch {
      return;
    }
  }

  function nomeProduto(id: string) {
    return produtos.find((p) => p.id === id)?.nome ?? 'Produto';
  }

  return (
    <Drawer
      open={open}
      title="Novo pedido"
      onClose={onClose}
      footer={
        <Button
          type="submit"
          form="form-criar-pedido"
          variant="primary"
          fullWidth
          disabled={isSubmitting || fields.length === 0}
          className="py-4"
        >
          {isSubmitting ? 'Criando…' : 'Criar pedido'}
        </Button>
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
          <div className="space-y-2">
            <Label htmlFor="contato">Contato</Label>
            <Controller
              name="cliente.contato"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  id="contato"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={Boolean(errors.cliente?.contato)}
                />
              )}
            />
            {errors.cliente?.contato ? (
              <p className="px-1 text-caption text-danger">
                {errors.cliente.contato.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Input
              id="cidade"
              placeholder="Cidade"
              error={Boolean(errors.cliente?.cidade)}
              {...register('cliente.cidade')}
            />
            {errors.cliente?.cidade ? (
              <p className="px-1 text-caption text-danger">
                {errors.cliente.cidade.message}
              </p>
            ) : null}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-subtitle-md font-medium text-on-surface">
            Adicionar item
          </h3>

          {produtosLoading ? (
            <div className="flex min-h-16 items-center justify-center">
              <div className="size-6 animate-pulse rounded-full bg-primary-container/40" />
            </div>
          ) : null}

          {produtosErro ? (
            <p className="text-caption text-danger">{produtosErro}</p>
          ) : null}

          {!produtosLoading && !produtosErro ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="produto">Produto</Label>
                <Select
                  id="produto"
                  value={produtoSelecionadoId}
                  onChange={(next) => {
                    setProdutoSelecionadoId(next);
                    setAdicionaisDraft([]);
                    setItemErro(null);
                  }}
                  options={produtoOptions}
                  placeholder="Selecione um produto"
                  searchPlaceholder="Buscar produto…"
                  emptyMessage="Nenhum produto encontrado"
                />
              </div>

              <div className="space-y-2">
                <Label>Quantidade</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="size-10 px-0 py-0"
                    aria-label="Diminuir quantidade"
                    onClick={() => setItemQtd((q) => Math.max(1, q - 1))}
                  >
                    <Minus size={18} strokeWidth={1.75} />
                  </Button>
                  <span className="min-w-8 text-center text-body-md text-on-surface">
                    {itemQtd}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    className="size-10 px-0 py-0"
                    aria-label="Aumentar quantidade"
                    onClick={() => setItemQtd((q) => q + 1)}
                  >
                    <Plus size={18} strokeWidth={1.75} />
                  </Button>
                </div>
              </div>

              {produtoSelecionado?.adicionais &&
              produtoSelecionado.adicionais.some((a) => a.ativo !== false) ? (
                <div className="space-y-2">
                  <Label>Adicionais</Label>
                  <ul className="flex flex-col gap-2">
                    {produtoSelecionado.adicionais
                      .filter((adicional) => adicional.ativo !== false)
                      .map((adicional) => {
                      const selecionado = adicionaisDraft.find(
                        (a) => a.id === adicional.id,
                      );
                      return (
                        <li
                          key={adicional.id}
                          className="rounded-xl border border-operator-border bg-operator-bg px-3 py-3"
                        >
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={Boolean(selecionado)}
                              onChange={() => toggleAdicional(adicional.id)}
                              className="size-4 accent-primary-container"
                            />
                            <span className="flex-1 text-body-md text-on-surface">
                              {adicional.nome}
                            </span>
                            <span className="text-caption text-on-surface-variant">
                              {formatarMoeda(Number(adicional.preco))}
                            </span>
                          </label>
                          {selecionado ? (
                            <div className="mt-2 flex items-center gap-2 pl-7">
                              <Button
                                type="button"
                                variant="ghost"
                                className="size-8 px-0 py-0"
                                aria-label="Diminuir adicional"
                                onClick={() =>
                                  setAdicionalQtd(
                                    adicional.id,
                                    selecionado.qtd - 1,
                                  )
                                }
                              >
                                <Minus size={16} strokeWidth={1.75} />
                              </Button>
                              <span className="text-caption text-on-surface">
                                {selecionado.qtd}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                className="size-8 px-0 py-0"
                                aria-label="Aumentar adicional"
                                onClick={() =>
                                  setAdicionalQtd(
                                    adicional.id,
                                    selecionado.qtd + 1,
                                  )
                                }
                              >
                                <Plus size={16} strokeWidth={1.75} />
                              </Button>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="observacao">Observação</Label>
                <Input
                  id="observacao"
                  placeholder="Opcional"
                  maxLength={140}
                  value={observacaoDraft}
                  onChange={(event) => setObservacaoDraft(event.target.value)}
                />
              </div>

              {itemErro ? (
                <p className="text-caption text-danger">{itemErro}</p>
              ) : null}

              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={handleAddItem}
              >
                Adicionar ao pedido
              </Button>
            </>
          ) : null}
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
              {fields.map((field, index) => (
                <li
                  key={field.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-operator-border bg-operator-card px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-body-md text-on-surface">
                      {field.qtd}× {nomeProduto(field.produtoId)}
                    </p>
                    {field.adicional && field.adicional.length > 0 ? (
                      <p className="text-caption text-on-surface-variant">
                        {field.adicional.length} adicional(is)
                      </p>
                    ) : null}
                    {field.observacao ? (
                      <p className="text-caption text-on-surface-variant">
                        {field.observacao}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="size-10 shrink-0 px-0 py-0 text-danger hover:bg-danger/10"
                    aria-label="Remover item"
                    onClick={() => remove(index)}
                  >
                    <Trash2 size={18} strokeWidth={1.75} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </form>
    </Drawer>
  );
}
