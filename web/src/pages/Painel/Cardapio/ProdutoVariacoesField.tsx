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
import { Plus, Trash2 } from 'lucide-react';

import { Button, CurrencyInput, Input, Label } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import type { ProdutoFormValues } from '../../../schemas/produto.schema';
import type { VariacaoProduto } from '../../../services/types';
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
  const erroLista = errors.variacoes?.root?.message ?? errors.variacoes?.message;

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
          onClick={onAdicionar}
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
        <ul className="flex flex-col gap-3">
          {fields.map((field, index) => {
            const ativo = watch(`variacoes.${index}.ativo`);
            const variacaoId = watch(`variacoes.${index}.id`);
            const original = variacaoId
              ? originais.find((item) => item.id === variacaoId)
              : undefined;
            const imagem = imagens[field.id] ?? { file: null, remover: false };

            return (
              <li
                key={field.id}
                className="overflow-hidden rounded-xl border border-operator-border bg-operator-bg p-3"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`variacao-ativo-${index}`}>Disponível</Label>
                    <button
                      type="button"
                      id={`variacao-ativo-${index}`}
                      role="switch"
                      aria-checked={ativo}
                      disabled={disabled}
                      onClick={() =>
                        setValue(`variacoes.${index}.ativo`, !ativo, {
                          shouldDirty: true,
                        })
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
                    <Label>Foto da variação</Label>
                    <ProdutoImagemField
                      key={`${imagemSessao}-${field.id}`}
                      file={imagem.file}
                      imagemUrlAtual={imagem.remover ? null : original?.imagemUrl}
                      imagemCacheKey={imagem.remover ? null : original?.updatedAt}
                      onChange={(proximo) =>
                        onChangeImagem(field.id, {
                          file: proximo,
                          remover: proximo ? false : imagem.remover,
                        })
                      }
                      onRemoverImagemAtual={() =>
                        onChangeImagem(field.id, { file: null, remover: true })
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
                      error={Boolean(errors.variacoes?.[index]?.nome)}
                      disabled={disabled}
                      {...register(`variacoes.${index}.nome`)}
                    />
                    {errors.variacoes?.[index]?.nome ? (
                      <p className="text-caption text-danger">
                        {errors.variacoes[index]?.nome?.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Label htmlFor={`variacao-preco-${index}`}>Preço</Label>
                      <Controller
                        name={`variacoes.${index}.preco`}
                        control={control}
                        render={({ field: precoField }) => (
                          <CurrencyInput
                            id={`variacao-preco-${index}`}
                            name={precoField.name}
                            ref={precoField.ref}
                            value={precoField.value}
                            onBlur={precoField.onBlur}
                            onChange={precoField.onChange}
                            error={Boolean(errors.variacoes?.[index]?.preco)}
                            disabled={disabled}
                            aria-label="Preço da variação"
                          />
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="dangerGhost"
                      className="size-12 shrink-0 px-0 py-0"
                      aria-label="Remover variação"
                      disabled={disabled}
                      onClick={() => onRemover(index)}
                    >
                      <Trash2 size={17} strokeWidth={1.75} />
                    </Button>
                  </div>
                  {errors.variacoes?.[index]?.preco ? (
                    <p className="text-caption text-danger">
                      {errors.variacoes[index]?.preco?.message}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
