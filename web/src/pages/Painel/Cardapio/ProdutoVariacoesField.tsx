import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Controller,
  type Control,
  type FieldArrayWithId,
  type FieldErrors,
  type FieldValues,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from 'react-hook-form';
import { ChevronRight, ImageIcon, Plus, Trash2 } from 'lucide-react';

import {
  Button,
  CurrencyInput,
  Drawer,
  Input,
  Label,
} from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { formatarMoeda } from '../../../lib/currency';
import type { ProdutoFormValues } from '../../../schemas/produto.schema';
import type { VariacaoProduto } from '../../../services/types';
import { urlImagemProduto } from './produtoFormat';
import { ProdutoImagemField } from './ProdutoImagemField';

export type VariacaoImagemDraft = {
  file: File | null;
  remover: boolean;
};

type ProdutoVariacoesFieldProps<TContext, TTransformed extends FieldValues> = {
  fields: FieldArrayWithId<ProdutoFormValues, 'variacoes', 'id'>[];
  control: Control<ProdutoFormValues, TContext, TTransformed>;
  register: UseFormRegister<ProdutoFormValues>;
  watch: UseFormWatch<ProdutoFormValues>;
  setValue: UseFormSetValue<ProdutoFormValues>;
  errors: FieldErrors<ProdutoFormValues>;
  originais: VariacaoProduto[];
  imagens: Record<string, VariacaoImagemDraft>;
  imagemSessao: number;
  onChangeImagem: (fieldKey: string, draft: VariacaoImagemDraft) => void;
  onAdicionar: () => void;
  onRemover: (index: number) => void;
  disabled?: boolean;
};

const SEM_IMAGEM: VariacaoImagemDraft = { file: null, remover: false };

function VariacaoMiniatura({
  file,
  url,
}: {
  file: File | null;
  url: string | null;
}) {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(
    null,
  );

  useEffect(() => {
    if (!file) return;
    let cancelado = false;
    const reader = new FileReader();
    reader.onload = () => {
      if (!cancelado && typeof reader.result === 'string') {
        setPreview({ file, url: reader.result });
      }
    };
    reader.readAsDataURL(file);
    return () => {
      cancelado = true;
      reader.abort();
    };
  }, [file]);

  const src = file ? (preview?.file === file ? preview.url : null) : url;

  return (
    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-operator-border bg-operator-surface text-on-surface-variant">
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <ImageIcon size={18} strokeWidth={1.75} />
      )}
    </div>
  );
}

/**
 * Lista compacta de variações (foto, nome, preço). Tocar numa linha abre um
 * drawer de baixo com o formulário completo da variação.
 */
export function ProdutoVariacoesField<
  TContext,
  TTransformed extends FieldValues,
>({
  fields,
  control,
  register,
  watch,
  setValue,
  errors,
  originais,
  imagens,
  imagemSessao,
  onChangeImagem,
  onAdicionar,
  onRemover,
  disabled = false,
}: ProdutoVariacoesFieldProps<TContext, TTransformed>) {
  const [editando, setEditando] = useState<number | null>(null);
  const erroLista =
    errors.variacoes?.root?.message ?? errors.variacoes?.message;

  const indiceAberto =
    editando !== null && editando < fields.length ? editando : null;
  const campoAberto = indiceAberto !== null ? fields[indiceAberto] : null;

  function originalDe(index: number) {
    const variacaoId = watch(`variacoes.${index}.id`);
    return variacaoId
      ? originais.find((item) => item.id === variacaoId)
      : undefined;
  }

  function handleAdicionar() {
    setEditando(fields.length);
    onAdicionar();
  }

  function handleRemover(index: number) {
    setEditando(null);
    onRemover(index);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Label>Variações</Label>
          <p className="text-caption text-on-surface-variant">
            Cada variação tem preço e foto próprios (ex.: sabores)
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-10 px-3"
          disabled={disabled}
          onClick={handleAdicionar}
        >
          <Plus size={14} strokeWidth={1.75} />
          Adicionar
        </Button>
      </div>

      {erroLista ? (
        <p className="text-caption text-danger">{erroLista}</p>
      ) : null}

      {fields.length === 0 ? (
        <p className="text-caption text-on-surface-variant">
          Nenhuma variação. Use “Adicionar” para incluir.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {fields.map((field, index) => {
            const nome = watch(`variacoes.${index}.nome`);
            const preco = watch(`variacoes.${index}.preco`);
            const ativo = watch(`variacoes.${index}.ativo`);
            const original = originalDe(index);
            const imagem = imagens[field.id] ?? SEM_IMAGEM;
            const comErro = Boolean(errors.variacoes?.[index]);

            return (
              <li key={field.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setEditando(index)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border bg-operator-bg p-2 text-left transition-colors hover:bg-on-surface/5',
                    comErro ? 'border-danger' : 'border-operator-border',
                  )}
                >
                  <VariacaoMiniatura
                    file={imagem.file}
                    url={
                      imagem.remover
                        ? null
                        : urlImagemProduto(
                            original?.imagemUrl,
                            original?.updatedAt,
                          )
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate text-body-md',
                        nome?.trim()
                          ? 'text-on-surface'
                          : 'text-on-surface-variant italic',
                      )}
                    >
                      {nome?.trim() || 'Sem nome'}
                    </span>
                    <span className="block text-caption text-on-surface-variant">
                      {formatarMoeda(Number(preco) || 0)}
                      {ativo ? null : ' · Indisponível'}
                    </span>
                    {comErro ? (
                      <span className="block text-caption text-danger">
                        Toque para corrigir
                      </span>
                    ) : null}
                  </div>
                  <ChevronRight
                    size={18}
                    strokeWidth={1.75}
                    className="shrink-0 text-on-surface-variant"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {createPortal(
        <Drawer
          open={campoAberto !== null}
          title="Variação"
          onClose={() => setEditando(null)}
          variant="sheet"
          footer={
            <div className="flex gap-2">
              <Button
                type="button"
                variant="dangerGhost"
                className="size-12 shrink-0 px-0 py-0"
                aria-label="Remover variação"
                disabled={disabled || indiceAberto === null}
                onClick={() => {
                  if (indiceAberto !== null) handleRemover(indiceAberto);
                }}
              >
                <Trash2 size={17} strokeWidth={1.75} />
              </Button>
              <Button
                type="button"
                fullWidth
                disabled={disabled}
                onClick={() => setEditando(null)}
              >
                Concluir
              </Button>
            </div>
          }
        >
          {campoAberto && indiceAberto !== null ? (
            <VariacaoEditor
              key={campoAberto.id}
              index={indiceAberto}
              fieldKey={campoAberto.id}
              control={control}
              register={register}
              watch={watch}
              setValue={setValue}
              errors={errors}
              original={originalDe(indiceAberto)}
              imagem={imagens[campoAberto.id] ?? SEM_IMAGEM}
              imagemSessao={imagemSessao}
              onChangeImagem={onChangeImagem}
              disabled={disabled}
            />
          ) : null}
        </Drawer>,
        document.body,
      )}
    </div>
  );
}

type VariacaoEditorProps<TContext, TTransformed extends FieldValues> = {
  index: number;
  fieldKey: string;
  control: Control<ProdutoFormValues, TContext, TTransformed>;
  register: UseFormRegister<ProdutoFormValues>;
  watch: UseFormWatch<ProdutoFormValues>;
  setValue: UseFormSetValue<ProdutoFormValues>;
  errors: FieldErrors<ProdutoFormValues>;
  original: VariacaoProduto | undefined;
  imagem: VariacaoImagemDraft;
  imagemSessao: number;
  onChangeImagem: (fieldKey: string, draft: VariacaoImagemDraft) => void;
  disabled: boolean;
};

function VariacaoEditor<TContext, TTransformed extends FieldValues>({
  index,
  fieldKey,
  control,
  register,
  watch,
  setValue,
  errors,
  original,
  imagem,
  imagemSessao,
  onChangeImagem,
  disabled,
}: VariacaoEditorProps<TContext, TTransformed>) {
  const ativo = watch(`variacoes.${index}.ativo`);
  const erros = errors.variacoes?.[index];

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label>Foto da variação</Label>
        <ProdutoImagemField
          key={`${imagemSessao}-${fieldKey}`}
          file={imagem.file}
          imagemUrlAtual={imagem.remover ? null : original?.imagemUrl}
          imagemCacheKey={imagem.remover ? null : original?.updatedAt}
          onChange={(proximo) =>
            onChangeImagem(fieldKey, {
              file: proximo,
              remover: proximo ? false : imagem.remover,
            })
          }
          onRemoverImagemAtual={() =>
            onChangeImagem(fieldKey, { file: null, remover: true })
          }
          disabled={disabled}
        />
        <p className="text-caption text-on-surface-variant">
          Sem foto, usa a foto do produto.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`variacao-nome-${index}`}>Nome</Label>
        <Input
          id={`variacao-nome-${index}`}
          placeholder="Ex.: Uva"
          error={Boolean(erros?.nome)}
          disabled={disabled}
          {...register(`variacoes.${index}.nome`)}
        />
        {erros?.nome ? (
          <p className="text-caption text-danger">{erros.nome.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`variacao-preco-${index}`}>Preço</Label>
        <Controller
          name={`variacoes.${index}.preco`}
          control={control}
          render={({ field }) => (
            <CurrencyInput
              id={`variacao-preco-${index}`}
              name={field.name}
              ref={field.ref}
              value={field.value}
              onBlur={field.onBlur}
              onChange={field.onChange}
              error={Boolean(erros?.preco)}
              disabled={disabled}
              aria-label="Preço da variação"
            />
          )}
        />
        {erros?.preco ? (
          <p className="text-caption text-danger">{erros.preco.message}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`variacao-ativo-${index}`}>Disponível</Label>
        <button
          type="button"
          id={`variacao-ativo-${index}`}
          role="switch"
          aria-checked={ativo}
          disabled={disabled}
          onClick={() =>
            setValue(`variacoes.${index}.ativo`, !ativo, { shouldDirty: true })
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
    </div>
  );
}
