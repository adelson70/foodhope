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
  Select,
  Textarea,
} from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { formatarMoeda } from '../../../lib/currency';
import {
  produtoSchema,
  type ProdutoFormValues,
} from '../../../schemas/produto.schema';
import {
  adicionalService,
  categoriaService,
  produtoService,
} from '../../../services';
import type {
  AdicionalEditarInput,
  AdicionalGlobal,
  Categoria,
  IngredienteEditarInput,
  Produto,
  VariacaoImagemAcao,
} from '../../../services/types';
import { ProdutoImagemField } from './ProdutoImagemField';
import {
  ProdutoVariacoesField,
  type VariacaoImagemDraft,
} from './ProdutoVariacoesField';

type ProdutoFormDrawerProps = {
  open: boolean;
  produto: Produto | null;
  onClose: () => void;
  onSaved: (produto: Produto) => void;
};

const FORM_ID = 'produto-form';
const SEM_CATEGORIA = '';

function valoresIniciais(produto: Produto | null): ProdutoFormValues {
  if (!produto) {
    return {
      nome: '',
      descricao: '',
      preco: 0,
      ativo: true,
      imprimirSeparado: false,
      ignorarImpressaoSozinho: false,
      categoriaId: null,
      adicionais: [],
      adicionalGlobalIds: [],
      ingredientes: [],
      tipo: 'SIMPLES',
      variacoes: [],
    };
  }

  return {
    nome: produto.nome,
    descricao: produto.descricao ?? '',
    preco: Number(produto.preco),
    ativo: produto.ativo ?? true,
    imprimirSeparado: produto.imprimirSeparado ?? false,
    ignorarImpressaoSozinho: produto.ignorarImpressaoSozinho ?? false,
    categoriaId: produto.categoria?.id ?? null,
    adicionais: (produto.adicionaisEspecificos ?? []).map((item) => ({
      id: item.id,
      nome: item.nome,
      preco: Number(item.preco),
      ativo: item.ativo ?? true,
    })),
    adicionalGlobalIds: produto.adicionalGlobalIds ?? [],
    ingredientes: (produto.ingredientes ?? []).map((item) => ({
      id: item.id,
      nome: item.nome,
    })),
    tipo: produto.tipo ?? 'SIMPLES',
    variacoes: (produto.variacoes ?? []).map((item) => ({
      id: item.id,
      nome: item.nome,
      preco: Number(item.preco),
      ativo: item.ativo ?? true,
    })),
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

function montarIngredientesEdicao(
  atuais: ProdutoFormValues['ingredientes'],
  originais: { id: string; nome: string }[],
): IngredienteEditarInput[] {
  const payload: IngredienteEditarInput[] = [];
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
      payload.push({ nome });
      continue;
    }

    const original = originais.find((o) => o.id === id);
    if (original && original.nome !== nome) {
      payload.push({ id, nome });
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
  const [imagemSessao, setImagemSessao] = useState(0);
  const [removerImagem, setRemoverImagem] = useState(false);
  const [animarPrimeiroAdicional, setAnimarPrimeiroAdicional] = useState(false);
  const [adicionaisSaindo, setAdicionaisSaindo] = useState<Set<string>>(
    () => new Set(),
  );
  const [animarPrimeiroIngrediente, setAnimarPrimeiroIngrediente] =
    useState(false);
  const [ingredientesSaindo, setIngredientesSaindo] = useState<Set<string>>(
    () => new Set(),
  );
  const [globais, setGlobais] = useState<AdicionalGlobal[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [variacaoImagens, setVariacaoImagens] = useState<
    Record<string, VariacaoImagemDraft>
  >({});

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

  const {
    fields: ingredientesFields,
    prepend: prependIngrediente,
    remove: removeIngrediente,
  } = useFieldArray({
    control,
    name: 'ingredientes',
  });

  const {
    fields: variacoesFields,
    append: appendVariacao,
    remove: removeVariacao,
  } = useFieldArray({
    control,
    name: 'variacoes',
  });

  const adicionalGlobalIds = watch('adicionalGlobalIds');
  const tipo = watch('tipo');

  useEffect(() => {
    if (!open) return;
    reset(valoresIniciais(produto));
    setImagemFile(null);
    setImagemSessao((sessao) => sessao + 1);
    setRemoverImagem(false);
    setVariacaoImagens({});
    setAnimarPrimeiroAdicional(false);
    setAdicionaisSaindo(new Set());
    setAnimarPrimeiroIngrediente(false);
    setIngredientesSaindo(new Set());

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

    categoriaService
      .listar()
      .then((response) => {
        if (cancelled || !response.sucesso || !response.dados) return;
        setCategorias(response.dados.categorias);
      })
      .catch(() => {
        if (!cancelled) setCategorias([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, produto, reset]);

  useEffect(() => {
    if (!animarPrimeiroAdicional) return;
    document.getElementById('adicional-nome-0')?.focus();
  }, [animarPrimeiroAdicional, fields]);

  useEffect(() => {
    if (!animarPrimeiroIngrediente) return;
    document.getElementById('ingrediente-nome-0')?.focus();
  }, [animarPrimeiroIngrediente, ingredientesFields]);

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

  function handleAdicionarIngrediente() {
    prependIngrediente({ nome: '' });
    setAnimarPrimeiroIngrediente(true);
  }

  function handleRemoverIngrediente(fieldId: string) {
    if (ingredientesSaindo.has(fieldId)) return;
    setIngredientesSaindo((atual) => new Set(atual).add(fieldId));
  }

  function finalizarRemocaoIngrediente(fieldId: string) {
    const index = ingredientesFields.findIndex((item) => item.id === fieldId);
    setIngredientesSaindo((atual) => {
      const proximo = new Set(atual);
      proximo.delete(fieldId);
      return proximo;
    });
    if (index >= 0) removeIngrediente(index);
  }

  function handleAdicionarVariacao() {
    appendVariacao({ nome: '', preco: watch('preco') ?? 0, ativo: true });
  }

  function handleRemoverVariacao(index: number) {
    const fieldKey = variacoesFields[index]?.id;
    if (fieldKey) {
      setVariacaoImagens((atual) => {
        const proximo = { ...atual };
        delete proximo[fieldKey];
        return proximo;
      });
    }
    removeVariacao(index);
  }

  function montarAcoesImagemVariacoes(
    variacoes: ProdutoFormValues['variacoes'],
  ): VariacaoImagemAcao[] {
    const acoes: VariacaoImagemAcao[] = [];
    variacoes.forEach((variacao, index) => {
      const fieldKey = variacoesFields[index]?.id;
      const draft = fieldKey ? variacaoImagens[fieldKey] : undefined;
      if (!draft) return;
      if (draft.file) {
        acoes.push({ id: variacao.id, nome: variacao.nome.trim(), imagem: draft.file });
      } else if (draft.remover && variacao.id) {
        acoes.push({ id: variacao.id, nome: variacao.nome.trim(), removerImagem: true });
      }
    });
    return acoes;
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

    const ingredientesAtuais = values.ingredientes.filter((_, index) => {
      const fieldId = ingredientesFields[index]?.id;
      return !fieldId || !ingredientesSaindo.has(fieldId);
    });

    const variavel = values.tipo === 'VARIAVEL';
    const variacoesValidas = variavel ? values.variacoes : [];
    // Produto variável: o preço do produto é o menor preço das variações (o backend recalcula).
    const preco =
      variavel && variacoesValidas.length > 0
        ? Math.min(...variacoesValidas.map((item) => item.preco))
        : values.preco;
    const variacaoImagensAcoes = variavel
      ? montarAcoesImagemVariacoes(variacoesValidas)
      : [];

    try {
      if (!produto) {
        const response = await produtoService.criar({
          nome: values.nome.trim(),
          descricao,
          preco,
          tipo: values.tipo,
          variacoes: variavel
            ? variacoesValidas.map((item) => ({
                nome: item.nome.trim(),
                preco: item.preco,
                ativo: item.ativo,
              }))
            : undefined,
          variacaoImagens: variacaoImagensAcoes,
          ativo: values.ativo,
          imprimirSeparado: values.imprimirSeparado,
          ignorarImpressaoSozinho: values.ignorarImpressaoSozinho,
          categoriaId: values.categoriaId,
          adicionais: adicionaisAtuais.map((item) => ({
            nome: item.nome.trim(),
            preco: item.preco,
            ativo: item.ativo,
          })),
          adicionalGlobalIds: values.adicionalGlobalIds,
          ingredientes: ingredientesAtuais.map((item) => ({
            nome: item.nome.trim(),
          })),
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

      const ingredientesOriginais = (produto.ingredientes ?? []).map(
        (item) => ({
          id: item.id,
          nome: item.nome,
        }),
      );
      const ingredientes = montarIngredientesEdicao(
        ingredientesAtuais,
        ingredientesOriginais,
      );

      const variacoesOriginais = (produto.variacoes ?? []).map((item) => ({
        id: item.id,
        nome: item.nome,
        preco: Number(item.preco),
        ativo: item.ativo ?? true,
      }));
      // Mesmo formato de adicionais: criar sem id, editar/deletar com id.
      const variacoes = variavel
        ? montarAdicionaisEdicao(variacoesValidas, variacoesOriginais)
        : [];

      const response = await produtoService.editar(produto.id, {
        nome: values.nome.trim(),
        descricao: descricao ?? '',
        preco,
        tipo: values.tipo,
        variacoes: variacoes.length > 0 ? variacoes : undefined,
        variacaoImagens: variacaoImagensAcoes,
        ativo: values.ativo,
        imprimirSeparado: values.imprimirSeparado,
        ignorarImpressaoSozinho: values.ignorarImpressaoSozinho,
        categoriaId: values.categoriaId,
        adicionais: adicionais.length > 0 ? adicionais : undefined,
        adicionalGlobalIds: values.adicionalGlobalIds,
        ingredientes: ingredientes.length > 0 ? ingredientes : undefined,
        imagem: imagemFile ?? undefined,
        removerImagem: removerImagem && !imagemFile,
      });

      if (!response.sucesso || !response.dados) return;
      if (!('id' in response.dados)) {
        onClose();
        return;
      }
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
          {tipo === 'VARIAVEL' ? (
            <p className="text-caption text-on-surface-variant">
              Foto padrão, usada nas variações sem foto
            </p>
          ) : null}
          <ProdutoImagemField
            key={imagemSessao}
            file={imagemFile}
            imagemUrlAtual={removerImagem ? null : produto?.imagemUrl}
            imagemCacheKey={removerImagem ? null : produto?.updatedAt}
            onChange={(proximo) => {
              setImagemFile(proximo);
              if (proximo) setRemoverImagem(false);
            }}
            onRemoverImagemAtual={() => setRemoverImagem(true)}
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
          <Label>Tipo do produto</Label>
          <div
            role="radiogroup"
            aria-label="Tipo do produto"
            className="grid grid-cols-2 gap-2"
          >
            {(
              [
                { valor: 'SIMPLES', label: 'Simples', ajuda: 'Um preço só' },
                {
                  valor: 'VARIAVEL',
                  label: 'Variável',
                  ajuda: 'Preço e foto por opção',
                },
              ] as const
            ).map((opcao) => {
              const ativo = tipo === opcao.valor;
              return (
                <button
                  key={opcao.valor}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  disabled={isSubmitting}
                  onClick={() =>
                    setValue('tipo', opcao.valor, { shouldDirty: true })
                  }
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left transition-colors',
                    ativo
                      ? 'border-primary/40 bg-primary-container/20'
                      : 'border-operator-border bg-operator-bg',
                  )}
                >
                  <span className="block text-body-md text-on-surface">
                    {opcao.label}
                  </span>
                  <span className="block text-caption text-on-surface-variant">
                    {opcao.ajuda}
                  </span>
                </button>
              );
            })}
          </div>
          {isEdicao &&
          produto?.tipo === 'VARIAVEL' &&
          tipo === 'SIMPLES' ? (
            <p className="text-caption text-danger">
              Ao salvar como simples, as variações deste produto serão
              apagadas.
            </p>
          ) : null}
        </div>

        {tipo === 'VARIAVEL' ? (
          <ProdutoVariacoesField
            fields={variacoesFields}
            control={control}
            register={register}
            watch={watch}
            setValue={setValue}
            errors={errors}
            originais={produto?.variacoes ?? []}
            imagens={variacaoImagens}
            imagemSessao={imagemSessao}
            onChangeImagem={(fieldKey, draft) =>
              setVariacaoImagens((atual) => ({ ...atual, [fieldKey]: draft }))
            }
            onAdicionar={handleAdicionarVariacao}
            onRemover={handleRemoverVariacao}
            disabled={isSubmitting}
          />
        ) : (
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
        )}

        <div className="space-y-2">
          <Label htmlFor="produto-categoria">Categoria</Label>
          <Controller
            name="categoriaId"
            control={control}
            render={({ field }) => (
              <Select
                id="produto-categoria"
                value={field.value ?? SEM_CATEGORIA}
                onChange={(value) =>
                  field.onChange(value === SEM_CATEGORIA ? null : value)
                }
                options={[
                  { value: SEM_CATEGORIA, label: 'Outros' },
                  ...categorias.map((item) => ({
                    value: item.id,
                    label: item.nome,
                  })),
                ]}
                placeholder="Outros"
                searchPlaceholder="Buscar categoria…"
                emptyMessage="Nenhuma categoria"
                disabled={isSubmitting}
                clearable={false}
              />
            )}
          />
          <p className="text-caption text-on-surface-variant">
            “Outros” é a seção dos produtos sem categoria (não cria registro no
            banco).
          </p>
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
              'relative h-5 w-9 shrink-0 rounded-full transition-colors',
              watch('ativo') ? 'bg-primary' : 'bg-outline-variant',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 size-4 rounded-full bg-surface shadow-card transition-transform',
                watch('ativo') && 'translate-x-4',
              )}
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-operator-border bg-operator-card px-3 py-3">
          <div className="min-w-0">
            <Label htmlFor="produto-imprimir-separado">Imprimir à parte</Label>
            <p className="text-caption text-on-surface-variant">
              Sai em cupom separado e também aparece no primeiro cupom do
              pedido
            </p>
          </div>
          <button
            type="button"
            id="produto-imprimir-separado"
            role="switch"
            aria-checked={watch('imprimirSeparado')}
            disabled={isSubmitting}
            onClick={() =>
              setValue('imprimirSeparado', !watch('imprimirSeparado'), {
                shouldDirty: true,
              })
            }
            className={cn(
              'relative h-5 w-9 shrink-0 rounded-full transition-colors',
              watch('imprimirSeparado') ? 'bg-primary' : 'bg-outline-variant',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 size-4 rounded-full bg-surface shadow-card transition-transform',
                watch('imprimirSeparado') && 'translate-x-4',
              )}
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-operator-border bg-operator-card px-3 py-3">
          <div className="min-w-0">
            <Label htmlFor="produto-ignorar-impressao-sozinho">
              Não imprimir sozinho
            </Label>
            <p className="text-caption text-on-surface-variant">
              Pedido só com este item não gera cupom; com outros produtos, entra
              no primeiro cupom (ex.: refri, água)
            </p>
          </div>
          <button
            type="button"
            id="produto-ignorar-impressao-sozinho"
            role="switch"
            aria-checked={watch('ignorarImpressaoSozinho')}
            disabled={isSubmitting}
            onClick={() =>
              setValue(
                'ignorarImpressaoSozinho',
                !watch('ignorarImpressaoSozinho'),
                { shouldDirty: true },
              )
            }
            className={cn(
              'relative h-5 w-9 shrink-0 rounded-full transition-colors',
              watch('ignorarImpressaoSozinho')
                ? 'bg-primary'
                : 'bg-outline-variant',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 size-4 rounded-full bg-surface shadow-card transition-transform',
                watch('ignorarImpressaoSozinho') && 'translate-x-4',
              )}
            />
          </button>
        </div>

        <div className="space-y-3">
          <Label>Adicionais globais</Label>
          {globais.length === 0 ? (
            <p className="text-caption text-on-surface-variant">
              Nenhum adicional global. Cadastre em Configurações → Cozinha →
              Adicionais.
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
              className="h-10 px-3"
              disabled={isSubmitting}
              onClick={handleAdicionarAdicional}
            >
              <Plus size={14} strokeWidth={1.75} />
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
                            'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                            ativo ? 'bg-primary' : 'bg-outline-variant',
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 left-0.5 size-4 rounded-full bg-surface shadow-card transition-transform',
                              ativo && 'translate-x-4',
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
                          variant="dangerGhost"
                          aria-label="Remover adicional"
                          className="size-12 shrink-0 px-0 py-0"
                          disabled={isSubmitting || saindo}
                          onClick={() => handleRemoverAdicional(field.id)}
                        >
                          <Trash2 size={17} strokeWidth={1.75} />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Label>Ingredientes (retirar)</Label>
              <p className="text-caption text-on-surface-variant">
                Aparecem como opções de retirada no pedido
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-10 px-3"
              disabled={isSubmitting}
              onClick={handleAdicionarIngrediente}
            >
              <Plus size={14} strokeWidth={1.75} />
              Adicionar
            </Button>
          </div>

          {ingredientesFields.length === 0 ? (
            <p className="text-caption text-on-surface-variant">
              Nenhum ingrediente. Use “Adicionar” para mapear o lanche.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {ingredientesFields.map((field, index) => {
                const saindo = ingredientesSaindo.has(field.id);
                const entrando =
                  index === 0 && animarPrimeiroIngrediente && !saindo;

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
                        finalizarRemocaoIngrediente(field.id);
                        return;
                      }
                      if (entrando) setAnimarPrimeiroIngrediente(false);
                    }}
                  >
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1 space-y-2">
                        <Label htmlFor={`ingrediente-nome-${index}`}>Nome</Label>
                        <Input
                          id={`ingrediente-nome-${index}`}
                          placeholder="Ex.: Cebola"
                          error={Boolean(errors.ingredientes?.[index]?.nome)}
                          disabled={isSubmitting || saindo}
                          {...register(`ingredientes.${index}.nome`)}
                        />
                        {errors.ingredientes?.[index]?.nome ? (
                          <p className="text-caption text-danger">
                            {errors.ingredientes[index]?.nome?.message}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="dangerGhost"
                        aria-label="Remover ingrediente"
                        className="size-12 shrink-0 px-0 py-0"
                        disabled={isSubmitting || saindo}
                        onClick={() => handleRemoverIngrediente(field.id)}
                      >
                        <Trash2 size={17} strokeWidth={1.75} />
                      </Button>
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
