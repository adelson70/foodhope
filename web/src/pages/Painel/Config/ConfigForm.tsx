import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, User } from 'lucide-react';

import { Button, Input, Label } from '../../../components/ui';
import { authService } from '../../../services';
import type { EditarOperadorInput, Operador } from '../../../services/types';
import {
  configSchema,
  type ConfigFormValues,
} from '../../../schemas/config.schema';

type ConfigFormProps = {
  operador: Operador;
  onUpdated: (operador: Operador) => void;
};

export function ConfigForm({ operador, onUpdated }: ConfigFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: { nome: operador.nome, senha: '' },
  });

  async function onSubmit(values: ConfigFormValues) {
    const input: EditarOperadorInput = {};

    if (values.nome !== operador.nome) {
      input.nome = values.nome;
    }

    if (values.senha.length > 0) {
      input.senha = values.senha;
    }

    if (!input.nome && !input.senha) {
      return;
    }

    try {
      const response = await authService.editar(input);
      if (response.sucesso && response.dados) {
        onUpdated(response.dados);
        reset({ nome: response.dados.nome, senha: '' });
      }
    } catch {
      return;
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-4"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          autoComplete="username"
          placeholder="Seu usuário"
          error={Boolean(errors.nome)}
          leftIcon={<User size={20} strokeWidth={1.75} />}
          {...register('nome')}
        />
        {errors.nome ? (
          <p className="px-1 text-caption text-danger">{errors.nome.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha">Nova senha</Label>
        <Input
          id="senha"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Deixe em branco para não alterar"
          error={Boolean(errors.senha)}
          leftIcon={<Lock size={20} strokeWidth={1.75} />}
          rightIcon={
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? (
                <EyeOff size={20} strokeWidth={1.75} />
              ) : (
                <Eye size={20} strokeWidth={1.75} />
              )}
            </button>
          }
          {...register('senha')}
        />
        {errors.senha ? (
          <p className="px-1 text-caption text-danger">{errors.senha.message}</p>
        ) : null}
      </div>

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={isSubmitting}
        className="mt-2 py-4"
      >
        {isSubmitting ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  );
}
