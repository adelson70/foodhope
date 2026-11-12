import { useEffect, useState, type ChangeEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Printer, ReceiptText, Search } from 'lucide-react';

import {
  Button,
  Drawer,
  Input,
  Label,
  Loading,
  Select,
} from '../../../components/ui';
import {
  impressoraSchema,
  type ImpressoraFormValues,
} from '../../../schemas/impressora.schema';
import { isOfflineNow } from '../../../lib/network';
import { getApiErrorMensagens, impressoraService } from '../../../services';
import type {
  DescobrirImpressorasDados,
  PortaImpressora,
} from '../../../services/types';

type ConfigImpressoraDrawerProps = {
  open: boolean;
  onClose: () => void;
};

const FORM_ID = 'config-impressora-form';

function redeDoIp(valor: string | null | undefined) {
  const match = valor?.trim().match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}(?::\d+)?$/);
  return match ? `${match[1]}.0/24` : '';
}

function payloadFromValues(values: ImpressoraFormValues) {
  const dispositivo = values.dispositivo?.trim() || null;
  if (dispositivo) {
    return { dispositivo };
  }
  return { ip: values.ip.trim() };
}

export function ConfigImpressoraDrawer({
  open,
  onClose,
}: ConfigImpressoraDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [testadoOk, setTestadoOk] = useState(false);
  const [testando, setTestando] = useState(false);
  const [imprimindo, setImprimindo] = useState(false);
  const [procurando, setProcurando] = useState(false);
  const [descoberta, setDescoberta] =
    useState<DescobrirImpressorasDados | null>(null);
  const [erroDescoberta, setErroDescoberta] = useState<string | null>(null);
  const [rede, setRede] = useState('');
  const [portas, setPortas] = useState<PortaImpressora[]>([]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ImpressoraFormValues>({
    resolver: zodResolver(impressoraSchema),
    defaultValues: { ip: '', dispositivo: null },
  });

  const ipAtual = watch('ip');
  const dispositivoAtual = watch('dispositivo');

  useEffect(() => {
    setTestadoOk(false);
  }, [ipAtual, dispositivoAtual]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setErro(null);
    setTestadoOk(false);
    setPortas([]);
    setDescoberta(null);
    setErroDescoberta(null);

    if (isOfflineNow()) {
      setLoading(false);
      setErro('Impressora indisponível offline.');
      return;
    }

    setLoading(true);

    Promise.all([impressoraService.obter(), impressoraService.listarPortas()])
      .then(([configResponse, portasResponse]) => {
        if (cancelled) return;

        if (!configResponse.sucesso) {
          setErro('Não foi possível carregar a configuração da impressora.');
          return;
        }

        setRede(redeDoIp(configResponse.dados?.ip));
        reset({
          ip: configResponse.dados?.ip ?? '',
          dispositivo: configResponse.dados?.dispositivo ?? null,
        });
        setPortas(
          portasResponse.sucesso ? (portasResponse.dados?.portas ?? []) : [],
        );
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
    const valido = await trigger();
    if (!valido) return;

    setTestando(true);
    setTestadoOk(false);

    try {
      const response = await impressoraService.testar(
        payloadFromValues(getValues()),
      );
      if (response.sucesso && response.dados?.conectada) {
        setTestadoOk(true);
      }
    } catch {
      setTestadoOk(false);
    } finally {
      setTestando(false);
    }
  }

  async function onProcurarNaRede() {
    setProcurando(true);
    setDescoberta(null);
    setErroDescoberta(null);

    try {
      const response = await impressoraService.descobrir(
        rede.trim() || undefined,
      );
      if (response.sucesso && response.dados) {
        setDescoberta(response.dados);
      } else {
        setErroDescoberta('Não foi possível procurar impressoras na rede.');
      }
    } catch (error: unknown) {
      setErroDescoberta(
        getApiErrorMensagens(error)[0] ??
          'Não foi possível procurar impressoras na rede.',
      );
    } finally {
      setProcurando(false);
    }
  }

  function usarImpressoraEncontrada(endereco: string) {
    setValue('dispositivo', null);
    setValue('ip', endereco, { shouldValidate: true });
  }

  async function onImprimirTeste() {
    const valido = await trigger();
    if (!valido) return;

    setImprimindo(true);

    try {
      const response = await impressoraService.imprimirTeste(
        payloadFromValues(getValues()),
      );
      if (response.sucesso && response.dados?.conectada) {
        setTestadoOk(true);
      }
    } catch {
      return;
    } finally {
      setImprimindo(false);
    }
  }

  async function onSubmit(values: ImpressoraFormValues) {
    if (!testadoOk) return;

    try {
      const response = await impressoraService.salvar(payloadFromValues(values));
      if (response.sucesso) {
        onClose();
      }
    } catch {
      return;
    }
  }

  const formPronto = !loading && !erro;
  const mostrarPortas = portas.length > 0;
  const ipField = register('ip');

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
              disabled={testando || imprimindo || isSubmitting}
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
              type="button"
              fullWidth
              variant="secondary"
              disabled={testando || imprimindo || isSubmitting}
              onClick={() => void onImprimirTeste()}
            >
              {imprimindo ? (
                'Imprimindo…'
              ) : (
                <>
                  <ReceiptText size={15} strokeWidth={2.25} />
                  Imprimir teste
                </>
              )}
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              fullWidth
              disabled={!testadoOk || isSubmitting || testando || imprimindo}
            >
              {isSubmitting ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        ) : null
      }
    >
      {loading ? <Loading label="Carregando impressora" /> : null}

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
              disabled={isSubmitting || testando || imprimindo}
              {...ipField}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                void ipField.onChange(event);
                if (event.target.value.trim() && getValues('dispositivo')) {
                  setValue('dispositivo', null, { shouldValidate: true });
                }
              }}
            />
            {errors.ip ? (
              <p className="px-1 text-caption text-danger">
                {errors.ip.message}
              </p>
            ) : null}
          </div>

          {mostrarPortas ? (
            <div className="space-y-2">
              <Label htmlFor="impressora-dispositivo">Porta local</Label>
              <Controller
                name="dispositivo"
                control={control}
                render={({ field }) => (
                  <Select
                    id="impressora-dispositivo"
                    value={field.value ?? ''}
                    onChange={(value) => {
                      field.onChange(value || null);
                      if (value) {
                        setValue('ip', '', { shouldValidate: true });
                      }
                    }}
                    options={portas.map((porta) => ({
                      value: porta.path,
                      label: porta.label,
                    }))}
                    placeholder="Escolher porta…"
                    searchPlaceholder="Buscar porta…"
                    emptyMessage="Nenhuma porta"
                    error={Boolean(errors.dispositivo)}
                    disabled={isSubmitting || testando || imprimindo}
                  />
                )}
              />
              {errors.dispositivo ? (
                <p className="px-1 text-caption text-danger">
                  {errors.dispositivo.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="impressora-rede">Procurar impressoras na rede</Label>
            <Input
              id="impressora-rede"
              autoComplete="off"
              placeholder="192.168.1.0/24"
              value={rede}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setRede(event.target.value)
              }
              disabled={procurando || isSubmitting || testando || imprimindo}
            />
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={procurando || isSubmitting || testando || imprimindo}
              onClick={() => void onProcurarNaRede()}
            >
              {procurando ? (
                'Procurando na rede…'
              ) : (
                <>
                  <Search size={15} strokeWidth={2.25} />
                  Procurar na rede
                </>
              )}
            </Button>

            {erroDescoberta ? (
              <p className="px-1 text-caption text-danger">{erroDescoberta}</p>
            ) : null}

            {descoberta ? (
              <div className="space-y-2">
                <p className="px-1 text-caption text-on-surface-variant">
                  {descoberta.impressoras.length > 0
                    ? `${descoberta.impressoras.length} encontrada(s) em ${descoberta.redes.join(', ')}. Toque para usar.`
                    : `Nenhuma impressora encontrada em ${descoberta.redes.join(', ')}.`}
                </p>
                {descoberta.impressoras.map((impressora) => (
                  <Button
                    key={impressora.endereco}
                    type="button"
                    variant={
                      ipAtual.trim() === impressora.endereco
                        ? 'success'
                        : 'secondary'
                    }
                    fullWidth
                    disabled={isSubmitting || testando || imprimindo}
                    onClick={() =>
                      usarImpressoraEncontrada(impressora.endereco)
                    }
                  >
                    <Printer size={15} strokeWidth={2.25} />
                    {impressora.endereco}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          <p className="px-1 text-caption text-on-surface-variant">
            {mostrarPortas
              ? 'Use o IP (host:porta, padrão 9100) ou uma porta local encontrada. Teste a conexão antes de salvar.'
              : 'Use o IP ou host:porta (porta padrão 9100). Teste a conexão antes de salvar.'}
          </p>
        </form>
      ) : null}
    </Drawer>
  );
}
