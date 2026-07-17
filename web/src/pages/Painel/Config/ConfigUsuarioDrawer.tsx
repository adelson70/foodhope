import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, User } from 'lucide-react';

import {
  Button,
  Drawer,
  Input,
  Label,
  Skeleton,
} from '../../../components/ui';
import {
  configSchema,
  type ConfigFormValues,
} from '../../../schemas/config.schema';
import { authService, getApiErrorMensagens } from '../../../services';
import type { EditarOperadorInput, Operador } from '../../../services/types';

type ConfigUsuarioDrawerProps = {
  open: boolean;
  onClose: () => void;
};

const FORM_ID = 'config-usuario-form';

export function ConfigUsuarioDrawer({ open, onClose }: ConfigUsuarioDrawerProps) {
  const [operador, setOperador] = useState<Operador | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: { nome: '', senha: '' },
  });

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setErro(null);
    setShowPassword(false);
    setOperador(null);

    authService
      .me()
      .then((response) => {
        if (cancelled) return;
        if (!response.sucesso || !response.dados) {
          setErro('Não foi possível carregar as configurações.');
          return;
        }
        setOperador(response.dados);
        reset({ nome: response.dados.nome, senha: '' });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const mensagens = getApiErrorMensagens(error);
        setErro(
          mensagens[0] ?? 'Não foi possível carregar as configurações.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, reset]);

  async function onSubmit(values: ConfigFormValues) {
    if (!operador) return;

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
        setOperador(response.dados);
        reset({ nome: response.dados.nome, senha: '' });
        onClose();
      }
    } catch {
      return;
    }
  }

  return (
    <Drawer
      open={open}
      title="Informações do usuário"
      onClose={onClose}
      footer={
        !loading && operador && !erro ? (
          <Button
            type="submit"
            form={FORM_ID}
            fullWidth
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Salvando…' : 'Salvar'}
          </Button>
        ) : null
      }
    >
      {loading ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : null}

      {!loading && erro ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-caption text-danger">
          {erro}
        </div>
      ) : null}

      {!loading && operador && !erro ? (
        <form
          id={FORM_ID}
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
            <Label htmlFor="senha">Nova senha</Label>
            <Input
              id="senha"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Deixe em branco para não alterar"
              error={Boolean(errors.senha)}
              leftIcon={<Lock size={20} strokeWidth={1.75} />}
              disabled={isSubmitting}
              rightIcon={
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={
                    showPassword ? 'Ocultar senha' : 'Mostrar senha'
                  }
                  className="text-on-surface-variant transition-colors hover:text-on-surface"
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
              <p className="px-1 text-caption text-danger">
                {errors.senha.message}
              </p>
            ) : null}
          </div>
        </form>
      ) : null}
    </Drawer>
  );
}
