import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Drawer, Input, Label } from '../../../components/ui';
import {
  categoriaSchema,
  type CategoriaFormValues,
} from '../../../schemas/categoria.schema';
import { categoriaService } from '../../../services';
import type { Categoria } from '../../../services/types';

type CozinhaCategoriaDrawerProps = {
  open: boolean;
  categoria: Categoria | null;
  onClose: () => void;
  onSaved: (categoria: Categoria) => void;
};

const FORM_ID = 'categoria-form';

export function CozinhaCategoriaDrawer({
  open,
  categoria,
  onClose,
  onSaved,
}: CozinhaCategoriaDrawerProps) {
  const isEdicao = Boolean(categoria);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { nome: '' },
  });

  useEffect(() => {
    if (!open) return;
    reset({ nome: categoria?.nome ?? '' });
  }, [open, categoria, reset]);

  async function onSubmit(values: CategoriaFormValues) {
    try {
      if (!categoria) {
        const response = await categoriaService.criar({
          nome: values.nome.trim(),
        });
        if (!response.sucesso || !response.dados) return;
        onSaved(response.dados);
        onClose();
        return;
      }

      const response = await categoriaService.editar(categoria.id, {
        nome: values.nome.trim(),
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
      title={isEdicao ? 'Editar categoria' : 'Nova categoria'}
      onClose={onClose}
      footer={
        <Button
          type="submit"
          form={FORM_ID}
          fullWidth
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Salvando…'
            : isEdicao
              ? 'Salvar alterações'
              : 'Criar categoria'}
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
          <Label htmlFor="categoria-nome">Nome</Label>
          <Input
            id="categoria-nome"
            placeholder="Ex.: Lanches"
            error={Boolean(errors.nome)}
            disabled={isSubmitting}
            {...register('nome')}
          />
          {errors.nome ? (
            <p className="text-caption text-danger">{errors.nome.message}</p>
          ) : null}
        </div>
      </form>
    </Drawer>
  );
}
