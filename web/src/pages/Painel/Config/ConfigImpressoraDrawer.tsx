import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Printer } from 'lucide-react';

import {
  Button,
  Drawer,
  Input,
  Label,
  Skeleton,
} from '../../../components/ui';
import {
  impressoraSchema,
  type ImpressoraFormValues,
} from '../../../schemas/impressora.schema';
import { getApiErrorMensagens, impressoraService } from '../../../services';

type ConfigImpressoraDrawerProps = {
  open: boolean;
  onClose: () => void;
};

const FORM_ID = 'config-impressora-form';

export function ConfigImpressoraDrawer({
  open,
  onClose,
}: ConfigImpressoraDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [testadoOk, setTestadoOk] = useState(false);
  const [testando, setTestando] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ImpressoraFormValues>({
    resolver: zodResolver(impressoraSchema),
    defaultValues: { ip: '' },
  });

  const ipAtual = watch('ip');

  useEffect(() => {
    setTestadoOk(false);
  }, [ipAtual]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setErro(null);
    setTestadoOk(false);

    impressoraService
      .obter()
      .then((response) => {
        if (cancelled) return;
        if (!response.sucesso) {
          setErro('Não foi possível carregar a configuração da impressora.');
          return;
        }
        reset({ ip: response.dados?.ip ?? '' });
        setTestadoOk(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const mensagens = getApiErrorMensagens(error);
        setErro(
          mensagens[0] ??
            'Não foi possível carregar a configuração da impressora.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, reset]);

  async function onTestar() {
    const valido = await trigger('ip');
    if (!valido) return;

    setTestando(true);
    setTestadoOk(false);

    try {
      const response = await impressoraService.testar(getValues('ip').trim());
      if (response.sucesso && response.dados?.conectada) {
        setTestadoOk(true);
      }
    } catch {
      setTestadoOk(false);
    } finally {
      setTestando(false);
    }
  }

  async function onSubmit(values: ImpressoraFormValues) {
    if (!testadoOk) return;

    try {
      const response = await impressoraService.salvar(values.ip);
      if (response.sucesso) {
        onClose();
      }
    } catch {
      return;
    }
  }

  const formPronto = !loading && !erro;

  return (
    <Drawer
      open={open}
      title="Impressora"
      onClose={onClose}
      footer={
        formPronto ? (
          <div className="flex w-full flex-col gap-2">
            <Button
              type="button"
              fullWidth
              variant={testadoOk ? 'success' : 'info'}
              disabled={testando || isSubmitting}
              onClick={() => void onTestar()}
            >
              {testando ? (
                'Testando…'
              ) : testadoOk ? (
                <>
                  <Check size={15} strokeWidth={2.25} />
                  Conexão OK
                </>
              ) : (
                'Testar conexão'
              )}
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              fullWidth
              disabled={!testadoOk || isSubmitting || testando}
            >
              {isSubmitting ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        ) : null
      }
    >
      {loading ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : null}

      {!loading && erro ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-caption text-danger">
          {erro}
        </div>
      ) : null}

      {formPronto ? (
        <form
          id={FORM_ID}
          onSubmit={handleSubmit(onSubmit)}
          className="flex w-full flex-col gap-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="impressora-ip">IP da impressora</Label>
            <Input
              id="impressora-ip"
              autoComplete="off"
              placeholder="192.168.1.50:9100"
              error={Boolean(errors.ip)}
              leftIcon={<Printer size={17} strokeWidth={1.75} />}
              disabled={isSubmitting || testando}
              {...register('ip')}
            />
            {errors.ip ? (
              <p className="px-1 text-caption text-danger">
                {errors.ip.message}
              </p>
            ) : null}
            <p className="px-1 text-caption text-on-surface-variant">
              Use o IP ou host:porta (porta padrão 9100). Teste a conexão antes
              de salvar.
            </p>
          </div>
        </form>
      ) : null}
    </Drawer>
  );
}
