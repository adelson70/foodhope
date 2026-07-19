import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, User } from 'lucide-react';

import { Button, Drawer, Input, Label, Select } from '../../../components/ui';
import type { SelectOption } from '../../../components/ui';
import {
  usuarioSchema,
  type UsuarioFormValues,
} from '../../../schemas/usuario.schema';
import { operadorService } from '../../../services';
import type { Operador } from '../../../services/types';

type UsuarioDrawerProps = {
  open: boolean;
  usuario: Operador | null;
  onClose: () => void;
  onSaved: (usuario: Operador) => void;
};

const FORM_ID = 'usuario-form';

const ROLE_OPTIONS: SelectOption[] = [
  {
    value: 'ADMIN',
    label: 'Administrador',
    description: 'Acesso total: dashboard, configurações e usuários',
  },
  {
    value: 'OPERADOR',
    label: 'Operador',
    description: 'Cardápio e pedidos',
  },
  {
    value: 'TOTEM',
    label: 'Totem',
    description: 'Modo quiosque para o cliente fazer o pedido',
  },
];

export function UsuarioDrawer({
  open,
  usuario,
  onClose,
  onSaved,
}: UsuarioDrawerProps) {
  const isEdicao = Boolean(usuario);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioSchema(isEdicao)),
    defaultValues: { nome: '', senha: '', role: 'OPERADOR' },
  });

  useEffect(() => {
    if (!open) return;
    setShowPassword(false);
    reset({
      nome: usuario?.nome ?? '',
      senha: '',
      role: usuario?.role ?? 'OPERADOR',
    });
  }, [open, usuario, reset]);

  async function onSubmit(values: UsuarioFormValues) {
    try {
      if (!usuario) {
        const response = await operadorService.criar({
          nome: values.nome.trim(),
          senha: values.senha,
          role: values.role,
        });
        if (!response.sucesso || !response.dados) return;
        onSaved(response.dados);
        onClose();
        return;
      }

      const input: {
        nome?: string;
        senha?: string;
        role?: UsuarioFormValues['role'];
      } = {};

      if (values.nome.trim() !== usuario.nome) input.nome = values.nome.trim();
      if (values.senha.length > 0) input.senha = values.senha;
      if (values.role !== usuario.role) input.role = values.role;

      if (!input.nome && !input.senha && !input.role) {
        onClose();
        return;
      }

      const response = await operadorService.editar(usuario.id, input);
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
      title={isEdicao ? 'Editar usuário' : 'Novo usuário'}
      onClose={onClose}
      footer={
        <Button type="submit" form={FORM_ID} fullWidth disabled={isSubmitting}>
          {isSubmitting
            ? 'Salvando…'
            : isEdicao
              ? 'Salvar alterações'
              : 'Criar usuário'}
        </Button>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-4"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="usuario-nome">Nome</Label>
          <Input
            id="usuario-nome"
            autoComplete="off"
            placeholder="Nome ou login"
            error={Boolean(errors.nome)}
            leftIcon={<User size={17} strokeWidth={1.75} />}
            disabled={isSubmitting}
            {...register('nome')}
          />
          {errors.nome ? (
            <p className="px-1 text-caption text-danger">
              {errors.nome.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="usuario-senha">
            {isEdicao ? 'Nova senha' : 'Senha'}
          </Label>
          <Input
            id="usuario-senha"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder={
              isEdicao ? 'Deixe em branco para não alterar' : '••••••••'
            }
            error={Boolean(errors.senha)}
            leftIcon={<Lock size={17} strokeWidth={1.75} />}
            disabled={isSubmitting}
            rightIcon={
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="text-on-surface-variant transition-colors hover:text-on-surface"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <EyeOff size={17} strokeWidth={1.75} />
                ) : (
                  <Eye size={17} strokeWidth={1.75} />
                )}
              </button>
            }
            {...register('senha')}
          />
          {errors.senha ? (
            <p className="px-1 text-caption text-danger">
              {errors.senha.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="usuario-role">Nível de acesso</Label>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select
                id="usuario-role"
                value={field.value}
                onChange={(value) => field.onChange(value || field.value)}
                options={ROLE_OPTIONS}
                clearable={false}
                error={Boolean(errors.role)}
                disabled={isSubmitting}
              />
            )}
          />
          {errors.role ? (
            <p className="px-1 text-caption text-danger">
              {errors.role.message}
            </p>
          ) : null}
        </div>
      </form>
    </Drawer>
  );
}
