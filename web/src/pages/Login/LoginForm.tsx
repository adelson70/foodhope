import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, User } from 'lucide-react';

import { Button, Input, Label } from '../../components/ui';
import { authService } from '../../services';
import {
  loginSchema,
  type LoginFormValues,
} from '../../schemas/login.schema';

export function LoginForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { nome: '', senha: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      await authService.login(values);
      navigate('/painel', { replace: true });
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
          leftIcon={<User size={17} strokeWidth={1.75} />}
          {...register('nome')}
        />
        {errors.nome ? (
          <p className="px-1 text-caption text-danger">{errors.nome.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <Input
          id="senha"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          error={Boolean(errors.senha)}
          leftIcon={<Lock size={17} strokeWidth={1.75} />}
          rightIcon={
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
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
          <p className="px-1 text-caption text-danger">{errors.senha.message}</p>
        ) : null}
      </div>

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={isSubmitting}
        className="mt-2"
      >
        {isSubmitting ? 'Entrando…' : 'Entrar'}
        {!isSubmitting ? <ArrowRight size={15} strokeWidth={1.75} /> : null}
      </Button>
    </form>
  );
}
