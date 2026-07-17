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
import { formatarMoeda } from '../../../lib/currency';
import {
  produtoSchema,
  type ProdutoFormValues,
} from '../../../schemas/produto.schema';
import { adicionalService, produtoService } from '../../../services';
import type {
  AdicionalEditarInput,
  AdicionalGlobal,
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
    return {
      nome: '',
      descricao: '',
      preco: 0,
      ativo: true,
      adicionais: [],
      adicionalGlobalIds: [],
    };
  }

  return {
    nome: produto.nome,
    descricao: produto.descricao ?? '',
    preco: Number(produto.preco),
    ativo: produto.ativo ?? true,
    adicionais: (produto.adicionaisEspecificos ?? []).map((item) => ({
      id: item.id,
      nome: item.nome,
      preco: Number(item.preco),
      ativo: item.ativo ?? true,
    })),
    adicionalGlobalIds: produto.adicionalGlobalIds ?? [],
  };
}

function idAdicionalValido(id: string | undefined): id is string {
  return Boolean(id && id.trim());
}

function montarAdicionaisEdicao(
  atuais: ProdutoFormValues['adicionais'],
  originais: { id: string; nome: string; preco: number; ativo: boolean }[],
): AdicionalEditarInput[] {
  const payload: AdicionalEditarInput[] = [];
  const idsOriginais = new Set(originais.map((item) => item.id));
  const idsAtuais = new Set(
    atuais.map((item) => item.id).filter(idAdicionalValido),
  );

  for (const original of originais) {
    if (!idsAtuais.has(original.id)) {
      payload.push({ id: original.id, foiDeletado: true });
    }
  }

  for (const item of atuais) {
    const id = idAdicionalValido(item.id) ? item.id : undefined;
    const nome = item.nome.trim();

    if (!id || !idsOriginais.has(id)) {
      payload.push({ nome, preco: item.preco, ativo: item.ativo });
      continue;
    }

    const original = originais.find((o) => o.id === id);
    if (
      original &&
      (original.nome !== nome ||
        original.preco !== item.preco ||
        original.ativo !== item.ativo)
    ) {
      payload.push({
        id,
        nome,
        preco: item.preco,
        ativo: item.ativo,
      });
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
  const [globais, setGlobais] = useState<AdicionalGlobal[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues: valoresIniciais(null),
  });

  const { fields, prepend, remove } = useFieldArray({
    control,
    name: 'adicionais',
  });

  const adicionalGlobalIds = watch('adicionalGlobalIds');

  useEffect(() => {
    if (!open) return;
    reset(valoresIniciais(produto));
    setImagemFile(null);
    setAnimarPrimeiroAdicional(false);
    setAdicionaisSaindo(new Set());

    let cancelled = false;
    adicionalService
      .listar()
      .then((response) => {
        if (cancelled || !response.sucesso || !response.dados) return;
        setGlobais(response.dados.adicionais);
      })
      .catch(() => {
        if (!cancelled) setGlobais([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, produto, reset]);

  useEffect(() => {
    if (!animarPrimeiroAdicional) return;
    document.getElementById('adicional-nome-0')?.focus();
  }, [animarPrimeiroAdicional, fields]);

  function handleAdicionarAdicional() {
    prepend({ nome: '', preco: 0, ativo: true });
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

  function toggleGlobal(id: string) {
    const atual = adicionalGlobalIds ?? [];
    if (atual.includes(id)) {
      setValue(
        'adicionalGlobalIds',
        atual.filter((item) => item !== id),
        { shouldDirty: true },
      );
      return;
    }
    setValue('adicionalGlobalIds', [...atual, id], { shouldDirty: true });
  }

  async function onSubmit(values: ProdutoFormValues) {
    const descricao =
      values.descricao.trim().length > 0 ? values.descricao.trim() : undefined;

    const adicionaisAtuais = values.adicionais.filter((_, index) => {
      const fieldId = fields[index]?.id;
      return !fieldId || !adicionaisSaindo.has(fieldId);
    });

    try {
      if (!produto) {
        const response = await produtoService.criar({
          nome: values.nome.trim(),
          descricao,
          preco: values.preco,
          ativo: values.ativo,
          adicionais: adicionaisAtuais.map((item) => ({
            nome: item.nome.trim(),
            preco: item.preco,
            ativo: item.ativo,
          })),
          adicionalGlobalIds: values.adicionalGlobalIds,
          imagem: imagemFile ?? undefined,
        });

        if (!response.sucesso || !response.dados) return;
        onSaved(response.dados);
        onClose();
        return;
      }

      const originais = (produto.adicionaisEspecificos ?? []).map((item) => ({
        id: item.id,
        nome: item.nome,
        preco: Number(item.preco),
        ativo: item.ativo ?? true,
      }));
      const adicionais = montarAdicionaisEdicao(adicionaisAtuais, originais);

      const response = await produtoService.editar(produto.id, {
        nome: values.nome.trim(),
        descricao: descricao ?? '',
        preco: values.preco,
        ativo: values.ativo,
        adicionais: adicionais.length > 0 ? adicionais : undefined,
        adicionalGlobalIds: values.adicionalGlobalIds,
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

        <div className="flex items-center justify-between gap-3 rounded-xl border border-operator-border bg-operator-card px-3 py-3">
          <div className="min-w-0">
            <Label htmlFor="produto-ativo">Disponível no cardápio</Label>
            <p className="text-caption text-on-surface-variant">
              Desative para marcar como fora de estoque
            </p>
          </div>
          <button
            type="button"
            id="produto-ativo"
            role="switch"
            aria-checked={watch('ativo')}
            disabled={isSubmitting}
            onClick={() => setValue('ativo', !watch('ativo'), { shouldDirty: true })}
            className={cn(
              'relative h-8 w-14 shrink-0 rounded-full transition-colors',
              watch('ativo') ? 'bg-primary' : 'bg-outline-variant',
            )}
          >
            <span
              className={cn(
                'absolute top-1 size-6 rounded-full bg-surface shadow-card transition-transform',
                watch('ativo') ? 'left-7' : 'left-1',
              )}
            />
          </button>
        </div>

        <div className="space-y-3">
          <Label>Adicionais globais</Label>
          {globais.length === 0 ? (
            <p className="text-caption text-on-surface-variant">
              Nenhum adicional global. Cadastre em Configurações → Cozinha.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {globais.map((global) => {
                const marcado = (adicionalGlobalIds ?? []).includes(global.id);
                return (
                  <li key={global.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3',
                        marcado
                          ? 'border-primary/40 bg-primary-container/20'
                          : 'border-operator-border bg-operator-bg',
                        !global.ativo && 'opacity-60',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="size-5 accent-primary"
                        checked={marcado}
                        disabled={isSubmitting}
                        onChange={() => toggleGlobal(global.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-body-md text-on-surface">
                          {global.nome}
                        </span>
                        <span className="block text-caption text-on-surface-variant">
                          {formatarMoeda(Number(global.preco))}
                          {!global.ativo ? ' · inativo na casa' : ''}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label>Adicionais deste produto</Label>
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
              Nenhum adicional específico. Use “Adicionar” para incluir.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {fields.map((field, index) => {
                const saindo = adicionaisSaindo.has(field.id);
                const entrando =
                  index === 0 && animarPrimeiroAdicional && !saindo;
                const ativo = watch(`adicionais.${index}.ativo`);

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
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor={`adicional-ativo-${index}`}>
                          Disponível neste produto
                        </Label>
                        <button
                          type="button"
                          id={`adicional-ativo-${index}`}
                          role="switch"
                          aria-checked={ativo}
                          disabled={isSubmitting || saindo}
                          onClick={() =>
                            setValue(
                              `adicionais.${index}.ativo`,
                              !ativo,
                              { shouldDirty: true },
                            )
                          }
                          className={cn(
                            'relative h-8 w-14 shrink-0 rounded-full transition-colors',
                            ativo ? 'bg-primary' : 'bg-outline-variant',
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-1 size-6 rounded-full bg-surface shadow-card transition-transform',
                              ativo ? 'left-7' : 'left-1',
                            )}
                          />
                        </button>
                      </div>
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
