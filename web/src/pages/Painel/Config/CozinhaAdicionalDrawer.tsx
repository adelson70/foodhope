import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Button,
  CurrencyInput,
  Drawer,
  Input,
  Label,
} from '../../../components/ui';
import {
  adicionalGlobalSchema,
  type AdicionalGlobalFormValues,
} from '../../../schemas/adicional-global.schema';
import { adicionalService } from '../../../services';
import type { AdicionalGlobal } from '../../../services/types';

type CozinhaAdicionalDrawerProps = {
  open: boolean;
  adicional: AdicionalGlobal | null;
  onClose: () => void;
  onSaved: (adicional: AdicionalGlobal) => void;
};

const FORM_ID = 'adicional-global-form';

export function CozinhaAdicionalDrawer({
  open,
  adicional,
  onClose,
  onSaved,
}: CozinhaAdicionalDrawerProps) {
  const isEdicao = Boolean(adicional);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdicionalGlobalFormValues>({
    resolver: zodResolver(adicionalGlobalSchema),
    defaultValues: { nome: '', preco: 0 },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      nome: adicional?.nome ?? '',
      preco: adicional ? Number(adicional.preco) : 0,
    });
  }, [open, adicional, reset]);

  async function onSubmit(values: AdicionalGlobalFormValues) {
    try {
      if (!adicional) {
        const response = await adicionalService.criar({
          nome: values.nome.trim(),
          preco: values.preco,
        });
        if (!response.sucesso || !response.dados) return;
        onSaved(response.dados);
        onClose();
        return;
      }

      const response = await adicionalService.editar(adicional.id, {
        nome: values.nome.trim(),
        preco: values.preco,
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
      title={isEdicao ? 'Editar adicional' : 'Novo adicional'}
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
              : 'Criar adicional'}
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
          <Label htmlFor="adicional-global-nome">Nome</Label>
          <Input
            id="adicional-global-nome"
            placeholder="Ex.: Ovo"
            error={Boolean(errors.nome)}
            disabled={isSubmitting}
            {...register('nome')}
          />
          {errors.nome ? (
            <p className="text-caption text-danger">{errors.nome.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="adicional-global-preco">Preço</Label>
          <Controller
            name="preco"
            control={control}
            render={({ field }) => (
              <CurrencyInput
                id="adicional-global-preco"
                name={field.name}
                ref={field.ref}
                value={field.value}
                onBlur={field.onBlur}
                onChange={field.onChange}
                error={Boolean(errors.preco)}
                disabled={isSubmitting}
                aria-label="Preço do adicional"
              />
            )}
          />
          {errors.preco ? (
            <p className="text-caption text-danger">{errors.preco.message}</p>
          ) : null}
        </div>
      </form>
    </Drawer>
  );
}
