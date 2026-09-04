import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy } from 'lucide-react';

import { Button, Drawer, Input, Label, Loading } from '../../../components/ui';
import {
  infinitepaySchema,
  type InfinitePayFormValues,
} from '../../../schemas/infinitepay.schema';
import {
  getApiErrorMensagens,
  infinitepayService,
  notifyError,
  notifySuccess,
} from '../../../services';

type ConfigInfinitePayDrawerProps = {
  open: boolean;
  onClose: () => void;
};

const FORM_ID = 'config-infinitepay-form';

export function ConfigInfinitePayDrawer({
  open,
  onClose,
}: ConfigInfinitePayDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
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
  } = useForm<InfinitePayFormValues>({
    resolver: zodResolver(infinitepaySchema),
    defaultValues: { handle: '' },
  });

  const handleAtual = watch('handle');

  useEffect(() => {
    setTestadoOk(false);
  }, [handleAtual]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setErro(null);
    setTestadoOk(false);

    infinitepayService
      .obter()
      .then((response) => {
        if (cancelled) return;
        if (!response.sucesso) {
          setErro('Não foi possível carregar a configuração da InfinitePay.');
          return;
        }
        reset({ handle: response.dados?.handle ?? '' });
        setWebhookUrl(response.dados?.webhookUrl ?? null);
        setTestadoOk(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const mensagens = getApiErrorMensagens(error);
        setErro(
          mensagens[0] ??
            'Não foi possível carregar a configuração da InfinitePay.',
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
    const valido = await trigger();
    if (!valido) return;

    setTestando(true);
    setTestadoOk(false);

    try {
      const response = await infinitepayService.testar({
        handle: getValues('handle'),
      });
      if (response.sucesso && response.dados?.conectada) {
        setTestadoOk(true);
      }
    } catch {
      setTestadoOk(false);
    } finally {
      setTestando(false);
    }
  }

  async function onSubmit(values: InfinitePayFormValues) {
    if (!testadoOk) return;

    try {
      const response = await infinitepayService.salvar({
        handle: values.handle,
      });
      if (response.sucesso) {
        setWebhookUrl(response.dados?.webhookUrl ?? webhookUrl);
        onClose();
      }
    } catch {
      return;
    }
  }

  async function copiarWebhook() {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      notifySuccess('URL do webhook copiada');
    } catch {
      notifyError(null, 'Não foi possível copiar a URL');
    }
  }

  const formPronto = !loading && !erro;

  return (
    <Drawer
      open={open}
      title="InfinitePay"
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
        <div className="flex justify-center py-10">
          <Loading />
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
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <p className="text-caption text-on-surface-variant">
            Use a InfiniteTag do app InfinitePay, sem o símbolo $. Ative o
            Checkout Integrado em Vendas → Checkout → Configurações.
          </p>

          <div className="space-y-2">
            <Label htmlFor="infinitepay-handle">InfiniteTag (handle)</Label>
            <Input
              id="infinitepay-handle"
              placeholder="sua-tag"
              autoComplete="off"
              error={Boolean(errors.handle)}
              {...register('handle')}
            />
            {errors.handle ? (
              <p className="px-1 text-caption text-danger">
                {errors.handle.message}
              </p>
            ) : null}
          </div>

          {webhookUrl ? (
            <div className="space-y-2">
              <Label htmlFor="infinitepay-webhook">URL do webhook</Label>
              <div className="flex gap-2">
                <Input
                  id="infinitepay-webhook"
                  value={webhookUrl}
                  readOnly
                  className="min-w-0 flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="size-11 shrink-0 px-0 py-0"
                  aria-label="Copiar URL do webhook"
                  onClick={() => {
                    void copiarWebhook();
                  }}
                >
                  <Copy size={17} strokeWidth={1.75} />
                </Button>
              </div>
              <p className="text-caption text-on-surface-variant">
                Enviada automaticamente em cada link de pagamento.
              </p>
            </div>
          ) : null}
        </form>
      ) : null}
    </Drawer>
  );
}
