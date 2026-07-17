import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';

import {
  Button,
  CurrencyInput,
  Drawer,
  Input,
  Label,
  Textarea,
} from '../../../components/ui';
import { cn } from '../../../lib/cn';
import {
  produtoSchema,
  type ProdutoFormValues,
} from '../../../schemas/produto.schema';
import { produtoService } from '../../../services';
import type {
  AdicionalEditarInput,
  Produto,
} from '../../../services/types';
import { ProdutoImagemField } from './ProdutoImagemField';

type ProdutoFormDrawerProps = {
  open: boolean;
  produto: Produto | null;
  onClose: () => void;
  onSaved: (produto: Produto) => void;
};

const FORM_ID = 'produto-form';

function valoresIniciais(produto: Produto | null): ProdutoFormValues {
  if (!produto) {
    return { nome: '', descricao: '', preco: 0, adicionais: [] };
  }

  return {
    nome: produto.nome,
    descricao: produto.descricao ?? '',
    preco: Number(produto.preco),
    adicionais: (produto.adicionais ?? []).map((item) => ({
      id: item.id,
      nome: item.nome,
      preco: Number(item.preco),
    })),
  };
}

function montarAdicionaisEdicao(
  atuais: ProdutoFormValues['adicionais'],
  originais: { id: string; nome: string; preco: number }[],
): AdicionalEditarInput[] {
  const payload: AdicionalEditarInput[] = [];
  const idsAtuais = new Set(
    atuais.map((item) => item.id).filter((id): id is string => Boolean(id)),
  );

  for (const original of originais) {
    if (!idsAtuais.has(original.id)) {
      payload.push({ id: original.id, foiDeletado: true });
    }
  }

  for (const item of atuais) {
    if (!item.id) {
      payload.push({ nome: item.nome, preco: item.preco });
      continue;
    }

    const original = originais.find((o) => o.id === item.id);
    if (
      !original ||
      original.nome !== item.nome ||
      original.preco !== item.preco
    ) {
      payload.push({ id: item.id, nome: item.nome, preco: item.preco });
    }
  }

  return payload;
}

export function ProdutoFormDrawer({
  open,
  produto,
  onClose,
  onSaved,
}: ProdutoFormDrawerProps) {
  const isEdicao = Boolean(produto);
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [animarPrimeiroAdicional, setAnimarPrimeiroAdicional] = useState(false);
  const [adicionaisSaindo, setAdicionaisSaindo] = useState<Set<string>>(
    () => new Set(),
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues: valoresIniciais(null),
  });

  const { fields, prepend, remove } = useFieldArray({
    control,
    name: 'adicionais',
  });

  useEffect(() => {
    if (!open) return;
    reset(valoresIniciais(produto));
    setImagemFile(null);
    setAnimarPrimeiroAdicional(false);
    setAdicionaisSaindo(new Set());
  }, [open, produto, reset]);

  useEffect(() => {
    if (!animarPrimeiroAdicional) return;
    document.getElementById('adicional-nome-0')?.focus();
  }, [animarPrimeiroAdicional, fields]);

  function handleAdicionarAdicional() {
    prepend({ nome: '', preco: 0 });
    setAnimarPrimeiroAdicional(true);
  }

  function handleRemoverAdicional(fieldId: string) {
    if (adicionaisSaindo.has(fieldId)) return;
    setAdicionaisSaindo((atual) => new Set(atual).add(fieldId));
  }

  function finalizarRemocaoAdicional(fieldId: string) {
    const index = fields.findIndex((item) => item.id === fieldId);
    setAdicionaisSaindo((atual) => {
      const proximo = new Set(atual);
      proximo.delete(fieldId);
      return proximo;
    });
    if (index >= 0) remove(index);
  }

  async function onSubmit(values: ProdutoFormValues) {
    const descricao =
      values.descricao.trim().length > 0 ? values.descricao.trim() : undefined;

    try {
      if (!produto) {
        const response = await produtoService.criar({
          nome: values.nome.trim(),
          descricao,
          preco: values.preco,
          adicionais: values.adicionais.map((item) => ({
            nome: item.nome.trim(),
            preco: item.preco,
          })),
          imagem: imagemFile ?? undefined,
        });

        if (!response.sucesso || !response.dados) return;
        onSaved(response.dados);
        onClose();
        return;
      }

      const originais = (produto.adicionais ?? []).map((item) => ({
        id: item.id,
        nome: item.nome,
        preco: Number(item.preco),
      }));
      const adicionais = montarAdicionaisEdicao(values.adicionais, originais);

      const response = await produtoService.editar(produto.id, {
        nome: values.nome.trim(),
        descricao: descricao ?? '',
        preco: values.preco,
        adicionais: adicionais.length > 0 ? adicionais : undefined,
        imagem: imagemFile ?? undefined,
      });

      if (!response.sucesso || !response.dados) return;
      if (!('id' in response.dados)) return;
      onSaved(response.dados);
      onClose();
    } catch {
      return;
    }
  }

  return (
    <Drawer
      open={open}
      title={isEdicao ? 'Editar produto' : 'Novo produto'}
      onClose={onClose}
      footer={
        <Button
          type="submit"
          form={FORM_ID}
          fullWidth
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Salvando...'
            : isEdicao
              ? 'Salvar alterações'
              : 'Criar produto'}
        </Button>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="space-y-2">
          <Label>Foto do produto</Label>
          <ProdutoImagemField
            file={imagemFile}
            imagemUrlAtual={produto?.imagemUrl}
            onChange={setImagemFile}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="produto-nome">Nome</Label>
          <Input
            id="produto-nome"
            placeholder="Ex.: X Burguer"
            error={Boolean(errors.nome)}
            disabled={isSubmitting}
            {...register('nome')}
          />
          {errors.nome ? (
            <p className="text-caption text-danger">{errors.nome.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="produto-descricao">Descrição</Label>
          <Textarea
            id="produto-descricao"
            rows={5}
            placeholder="Descreva o produto"
            error={Boolean(errors.descricao)}
            disabled={isSubmitting}
            {...register('descricao')}
          />
          {errors.descricao ? (
            <p className="text-caption text-danger">
              {errors.descricao.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="produto-preco">Preço</Label>
          <Controller
            name="preco"
            control={control}
            render={({ field }) => (
              <CurrencyInput
                id="produto-preco"
                name={field.name}
                ref={field.ref}
                value={field.value}
                onBlur={field.onBlur}
                onChange={field.onChange}
                error={Boolean(errors.preco)}
                disabled={isSubmitting}
                aria-label="Preço do produto"
              />
            )}
          />
          {errors.preco ? (
            <p className="text-caption text-danger">{errors.preco.message}</p>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label>Adicionais</Label>
            <Button
              type="button"
              variant="ghost"
              className="h-10 px-3 text-caption"
              disabled={isSubmitting}
              onClick={handleAdicionarAdicional}
            >
              <Plus size={16} strokeWidth={1.75} />
              Adicionar
            </Button>
          </div>

          {fields.length === 0 ? (
            <p className="text-caption text-on-surface-variant">
              Nenhum adicional. Use “Adicionar” para incluir.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {fields.map((field, index) => {
                const saindo = adicionaisSaindo.has(field.id);
                const entrando =
                  index === 0 && animarPrimeiroAdicional && !saindo;

                return (
                  <li
                    key={field.id}
                    className={cn(
                      'overflow-hidden rounded-xl border border-operator-border bg-operator-bg p-3',
                      entrando && 'list-item-enter',
                      saindo && 'list-item-exit',
                    )}
                    onAnimationEnd={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (saindo) {
                        finalizarRemocaoAdicional(field.id);
                        return;
                      }
                      if (entrando) setAnimarPrimeiroAdicional(false);
                    }}
                  >
                    <input
                      type="hidden"
                      {...register(`adicionais.${index}.id`)}
                    />
                    <div className="flex flex-col gap-3">
                      <div className="space-y-2">
                        <Label htmlFor={`adicional-nome-${index}`}>Nome</Label>
                        <Input
                          id={`adicional-nome-${index}`}
                          placeholder="Ex.: Ovo"
                          error={Boolean(errors.adicionais?.[index]?.nome)}
                          disabled={isSubmitting || saindo}
                          {...register(`adicionais.${index}.nome`)}
                        />
                        {errors.adicionais?.[index]?.nome ? (
                          <p className="text-caption text-danger">
                            {errors.adicionais[index]?.nome?.message}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="min-w-0 flex-1 space-y-2">
                          <Label htmlFor={`adicional-preco-${index}`}>
                            Preço
                          </Label>
                          <Controller
                            name={`adicionais.${index}.preco`}
                            control={control}
                            render={({ field: precoField }) => (
                              <CurrencyInput
                                id={`adicional-preco-${index}`}
                                name={precoField.name}
                                ref={precoField.ref}
                                value={precoField.value}
                                onBlur={precoField.onBlur}
                                onChange={precoField.onChange}
                                error={Boolean(
                                  errors.adicionais?.[index]?.preco,
                                )}
                                disabled={isSubmitting || saindo}
                                aria-label={`Preço do adicional ${index + 1}`}
                              />
                            )}
                          />
                          {errors.adicionais?.[index]?.preco ? (
                            <p className="text-caption text-danger">
                              {errors.adicionais[index]?.preco?.message}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          aria-label="Remover adicional"
                          className="size-12 shrink-0 px-0 py-0 text-danger hover:bg-danger/10"
                          disabled={isSubmitting || saindo}
                          onClick={() => handleRemoverAdicional(field.id)}
                        >
                          <Trash2 size={20} strokeWidth={1.75} />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </form>
    </Drawer>
  );
}
