import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  Cpu,
  Network,
  Printer,
  ReceiptText,
  Search,
  Usb,
} from "lucide-react";

import {
  Button,
  Drawer,
  Input,
  Label,
  Loading,
  Select,
} from "../../../components/ui";
import { cn } from "../../../lib/cn";
import {
  impressoraSchema,
  type ImpressoraFormValues,
} from "../../../schemas/impressora.schema";
import { isOfflineNow } from "../../../lib/network";
import { getApiErrorMensagens, impressoraService } from "../../../services";
import type {
  ConfigurarImpressoraInput,
  DescobrirImpressorasDados,
  EstadoPonte,
  ModoImpressora,
  PortaImpressora,
} from "../../../services/types";
import { PonteEsp32Card } from "./PonteEsp32Card";

type ConfigImpressoraDrawerProps = {
  open: boolean;
  onClose: () => void;
};

const FORM_ID = "config-impressora-form";

function redeDoIp(valor: string | null | undefined) {
  const match = valor
    ?.trim()
    .match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}(?::\d+)?$/);
  return match ? `${match[1]}.0/24` : "";
}

const MODOS: { value: ModoImpressora; label: string; icone: typeof Printer }[] =
  [
    { value: "rede", label: "Rede", icone: Network },
    { value: "local", label: "USB/serial", icone: Usb },
    { value: "ponte", label: "Ponte ESP32", icone: Cpu },
  ];

function payloadFromValues(
  values: ImpressoraFormValues,
  modo: ModoImpressora,
): ConfigurarImpressoraInput {
  if (modo === "ponte") return { ponte: true };
  if (modo === "local")
    return { dispositivo: values.dispositivo?.trim() ?? "" };
  return { ip: values.ip.trim() };
}

function ModoSelector({
  value,
  onChange,
  disabled,
}: {
  value: ModoImpressora;
  onChange: (modo: ModoImpressora) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Modo da impressora"
      className="grid grid-cols-3 gap-2"
    >
      {MODOS.map(({ value: modo, label, icone: Icone }) => {
        const ativo = value === modo;
        return (
          <button
            key={modo}
            type="button"
            role="radio"
            aria-checked={ativo}
            disabled={disabled}
            onClick={() => onChange(modo)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-caption font-medium transition-colors",
              "disabled:opacity-50",
              ativo
                ? "border-primary bg-primary-container/40 text-on-surface"
                : "border-operator-border bg-operator-card text-on-surface-variant hover:text-on-surface",
            )}
          >
            <Icone size={18} strokeWidth={1.75} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
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
  const [rede, setRede] = useState("");
  const [portas, setPortas] = useState<PortaImpressora[]>([]);
  const [modo, setModo] = useState<ModoImpressora>("rede");
  const [estadoPonte, setEstadoPonte] = useState<EstadoPonte | null>(null);
  const onEstadoPonte = useCallback(
    (e: EstadoPonte | null) => setEstadoPonte(e),
    [],
  );

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
    defaultValues: { ip: "", dispositivo: null },
  });

  const ipAtual = watch("ip");
  const dispositivoAtual = watch("dispositivo");

  useEffect(() => {
    setTestadoOk(false);
  }, [ipAtual, dispositivoAtual, modo]);

  function trocarModo(novo: ModoImpressora) {
    setModo(novo);
    // o outro campo sai do formulário para não travar a validação
    if (novo === "rede") setValue("dispositivo", null);
    if (novo === "local") setValue("ip", "");
  }

  async function validar() {
    return modo === "ponte" ? true : trigger();
  }

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
      setErro("Impressora indisponível offline.");
      return;
    }

    setLoading(true);

    Promise.all([impressoraService.obter(), impressoraService.listarPortas()])
      .then(([configResponse, portasResponse]) => {
        if (cancelled) return;

        if (!configResponse.sucesso) {
          setErro("Não foi possível carregar a configuração da impressora.");
          return;
        }

        setRede(redeDoIp(configResponse.dados?.ip));
        setModo(
          configResponse.dados?.ponte
            ? "ponte"
            : configResponse.dados?.dispositivo
              ? "local"
              : "rede",
        );
        reset({
          ip: configResponse.dados?.ip ?? "",
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
            "Não foi possível carregar a configuração da impressora.",
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
    const valido = await validar();
    if (!valido) return;

    setTestando(true);
    setTestadoOk(false);

    try {
      const response = await impressoraService.testar(
        payloadFromValues(getValues(), modo),
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
        setErroDescoberta("Não foi possível procurar impressoras na rede.");
      }
    } catch (error: unknown) {
      setErroDescoberta(
        getApiErrorMensagens(error)[0] ??
          "Não foi possível procurar impressoras na rede.",
      );
    } finally {
      setProcurando(false);
    }
  }

  function usarImpressoraEncontrada(endereco: string) {
    setValue("dispositivo", null);
    setValue("ip", endereco, { shouldValidate: true });
  }

  async function onImprimirTeste() {
    const valido = await validar();
    if (!valido) return;

    setImprimindo(true);

    try {
      const response = await impressoraService.imprimirTeste(
        payloadFromValues(getValues(), modo),
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

  async function salvar(values: ImpressoraFormValues) {
    if (!testadoOk) return;

    try {
      const response = await impressoraService.salvar(
        payloadFromValues(values, modo),
      );
      if (response.sucesso) {
        onClose();
      }
    } catch {
      return;
    }
  }

  // no modo ponte o formulário (IP/porta) não participa: salva sem passar pelo zod
  const onSubmit =
    modo === "ponte"
      ? (event: React.FormEvent) => {
          event.preventDefault();
          void salvar(getValues());
        }
      : handleSubmit(salvar);

  const formPronto = !loading && !erro;
  const ipField = register("ip");
  const pontePronta =
    !!estadoPonte?.autorizada && !!estadoPonte.status?.impressoraOnline;
  const bloqueado = testando || imprimindo || isSubmitting;

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
              variant={testadoOk ? "success" : "info"}
              disabled={bloqueado || (modo === "ponte" && !pontePronta)}
              onClick={() => void onTestar()}
            >
              {testando ? (
                "Testando…"
              ) : testadoOk ? (
                <>
                  <Check size={15} strokeWidth={2.25} />
                  Conexão OK
                </>
              ) : (
                "Testar conexão"
              )}
            </Button>
            <Button
              type="button"
              fullWidth
              variant="secondary"
              disabled={bloqueado || (modo === "ponte" && !pontePronta)}
              onClick={() => void onImprimirTeste()}
            >
              {imprimindo ? (
                "Imprimindo…"
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
              {isSubmitting ? "Salvando…" : "Salvar"}
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
          onSubmit={onSubmit}
          className="flex w-full flex-col gap-4"
          noValidate
        >
          <ModoSelector
            value={modo}
            onChange={trocarModo}
            disabled={bloqueado}
          />

          {modo === "ponte" ? (
            <>
              <PonteEsp32Card disabled={bloqueado} onEstado={onEstadoPonte} />
              <p className="px-1 text-caption text-on-surface-variant">
                O ESP32 fica no restaurante, na mesma rede da impressora, e
                recebe os cupons do servidor por conexão segura. Teste antes de
                salvar.
              </p>
            </>
          ) : null}

          {modo === "rede" ? (
            <>
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
                    if (event.target.value.trim() && getValues("dispositivo")) {
                      setValue("dispositivo", null, { shouldValidate: true });
                    }
                  }}
                />
                {errors.ip ? (
                  <p className="px-1 text-caption text-danger">
                    {errors.ip.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="impressora-rede">
                  Procurar impressoras na rede
                </Label>
                <Input
                  id="impressora-rede"
                  autoComplete="off"
                  placeholder="192.168.1.0/24"
                  value={rede}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setRede(event.target.value)
                  }
                  disabled={
                    procurando || isSubmitting || testando || imprimindo
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  disabled={
                    procurando || isSubmitting || testando || imprimindo
                  }
                  onClick={() => void onProcurarNaRede()}
                >
                  {procurando ? (
                    "Procurando na rede…"
                  ) : (
                    <>
                      <Search size={15} strokeWidth={2.25} />
                      Procurar na rede
                    </>
                  )}
                </Button>

                {erroDescoberta ? (
                  <p className="px-1 text-caption text-danger">
                    {erroDescoberta}
                  </p>
                ) : null}

                {descoberta ? (
                  <div className="space-y-2">
                    <p className="px-1 text-caption text-on-surface-variant">
                      {descoberta.impressoras.length > 0
                        ? `${descoberta.impressoras.length} encontrada(s) em ${descoberta.redes.join(", ")}. Toque para usar.`
                        : `Nenhuma impressora encontrada em ${descoberta.redes.join(", ")}.`}
                    </p>
                    {descoberta.impressoras.map((impressora) => (
                      <Button
                        key={impressora.endereco}
                        type="button"
                        variant={
                          ipAtual.trim() === impressora.endereco
                            ? "success"
                            : "secondary"
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
                Impressora de rede na mesma rede deste servidor. Use o IP ou
                host:porta (porta padrão 9100). Teste a conexão antes de salvar.
              </p>
            </>
          ) : null}

          {modo === "local" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="impressora-dispositivo">Porta local</Label>
                <Controller
                  name="dispositivo"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="impressora-dispositivo"
                      value={field.value ?? ""}
                      onChange={(value) => {
                        field.onChange(value || null);
                        if (value) {
                          setValue("ip", "", { shouldValidate: true });
                        }
                      }}
                      options={portas.map((porta) => ({
                        value: porta.path,
                        label: porta.label,
                      }))}
                      placeholder="Escolher porta…"
                      searchPlaceholder="Buscar porta…"
                      emptyMessage="Nenhuma porta USB/serial encontrada"
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
              <p className="px-1 text-caption text-on-surface-variant">
                Impressora ligada por USB/serial na máquina do servidor. Teste a
                conexão antes de salvar.
              </p>
            </>
          ) : null}
        </form>
      ) : null}
    </Drawer>
  );
}
