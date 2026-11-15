import { useEffect, useState, type ChangeEvent } from "react";
import {
  Cpu,
  Printer,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Wifi,
} from "lucide-react";

import { Button, Input, Label } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import { getApiErrorMensagens, impressoraService } from "../../../services";
import { socket } from "../../../services/socket";
import type { EstadoPonte, StatusPonte } from "../../../services/types";

const EVENTO_PONTE_STATUS = "ponte:status";
const IPV4 =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

const PAPEL: Record<StatusPonte["papel"], string> = {
  ok: "OK",
  acabando: "Acabando",
  "sem-papel": "Sem papel",
  desconhecido: "—",
};

function qualidadeSinal(rssi: number) {
  if (rssi >= -60) return "ótimo";
  if (rssi >= -70) return "bom";
  if (rssi >= -80) return "fraco";
  return "muito fraco";
}

function duracao(desde: string | null) {
  if (!desde) return "—";
  const s = Math.max(
    0,
    Math.round((Date.now() - new Date(desde).getTime()) / 1000),
  );
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
}

function Linha({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: "ok" | "erro";
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-caption">
      <span className="text-on-surface-variant">{rotulo}</span>
      <span
        className={cn(
          "text-right font-medium text-on-surface",
          destaque === "ok" && "text-success",
          destaque === "erro" && "text-danger",
        )}
      >
        {valor}
      </span>
    </div>
  );
}

type PonteEsp32CardProps = {
  disabled?: boolean;
  onEstado?: (estado: EstadoPonte | null) => void;
};

export function PonteEsp32Card({ disabled, onEstado }: PonteEsp32CardProps) {
  const [estado, setEstado] = useState<EstadoPonte | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ipFixo, setIpFixo] = useState("");
  const [acao, setAcao] = useState<"ip" | "redescobrir" | "aceitar" | null>(
    null,
  );
  const [, setRelogio] = useState(0);

  useEffect(() => {
    let cancelado = false;
    const aplicar = (novo: EstadoPonte) => {
      if (!cancelado) setEstado(novo);
    };

    impressoraService
      .estadoPonte()
      .then((r) => {
        if (r.sucesso && r.dados) aplicar(r.dados);
      })
      .catch((e: unknown) => {
        if (!cancelado)
          setErro(
            getApiErrorMensagens(e)[0] ?? "Não foi possível consultar a ponte.",
          );
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    // estado ao vivo empurrado pela API (sem polling)
    socket.on(EVENTO_PONTE_STATUS, aplicar);
    const tick = setInterval(() => setRelogio((n) => n + 1), 30_000);
    return () => {
      cancelado = true;
      socket.off(EVENTO_PONTE_STATUS, aplicar);
      clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    onEstado?.(estado);
  }, [estado, onEstado]);

  async function executar(tipo: "ip" | "redescobrir" | "aceitar") {
    setAcao(tipo);
    try {
      const r =
        tipo === "aceitar"
          ? await impressoraService.aceitarPonte()
          : await impressoraService.definirIpPonte(
              tipo === "ip" ? ipFixo.trim() : undefined,
            );
      if (r.sucesso && r.dados) setEstado(r.dados);
    } catch {
      return;
    } finally {
      setAcao(null);
    }
  }

  if (carregando) {
    return (
      <p className="px-1 text-caption text-on-surface-variant">
        Consultando a ponte…
      </p>
    );
  }

  if (erro) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-caption text-danger">
        {erro}
      </div>
    );
  }

  if (!estado?.habilitada) {
    return (
      <div className="rounded-xl border border-operator-border bg-operator-card px-4 py-3 text-caption text-on-surface-variant">
        Ponte desativada no servidor. Defina <code>PONTE_IMPRESSORA_TOKEN</code>{" "}
        no ambiente da API.
      </div>
    );
  }

  const status = estado.status;
  const ocupado = disabled || acao !== null;
  const ipValido = IPV4.test(ipFixo.trim());

  if (!estado.conectada) {
    return (
      <div className="space-y-2 rounded-xl border border-operator-border bg-operator-card p-4">
        <div className="flex items-center gap-2 text-body-md font-medium text-on-surface">
          <Cpu
            size={18}
            strokeWidth={1.75}
            className="animate-pulse text-on-surface-variant"
          />
          Aguardando ESP32…
        </div>
        <p className="text-caption text-on-surface-variant">
          Ligue o ESP32 na tomada perto da impressora. Ele entra no Wi-Fi,
          encontra a impressora e se conecta sozinho. Esta tela atualiza quando
          ele chegar.
        </p>
        {estado.macAutorizado ? (
          <p className="text-caption text-on-surface-variant">
            Autorizado: {estado.macAutorizado}
            {estado.statusEm ? ` · visto há ${duracao(estado.statusEm)}` : ""}
          </p>
        ) : null}
      </div>
    );
  }

  if (estado.macPendente) {
    return (
      <div className="space-y-3 rounded-xl border border-danger/30 bg-danger/10 p-4">
        <div className="flex items-center gap-2 text-body-md font-medium text-danger">
          <ShieldAlert size={18} strokeWidth={1.75} />
          Outro ESP32 conectado
        </div>
        <p className="text-caption text-on-surface">
          O dispositivo <b>{estado.macPendente}</b> tem o token certo, mas o
          autorizado é <b>{estado.macAutorizado ?? "—"}</b>. Ele não recebe
          cupons até ser aceito.
        </p>
        <Button
          type="button"
          variant="danger"
          fullWidth
          disabled={ocupado}
          onClick={() => void executar("aceitar")}
        >
          {acao === "aceitar" ? "Autorizando…" : "Autorizar este ESP32"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-success/30 bg-success/10 p-4">
        <div className="mb-2 flex items-center gap-2 text-body-md font-medium text-success">
          <ShieldCheck size={18} strokeWidth={1.75} />
          ESP32 conectado e autenticado
        </div>
        <div className="divide-y divide-operator-border">
          <Linha rotulo="Dispositivo" valor={status?.mac ?? "—"} />
          <Linha
            rotulo="Firmware"
            valor={status?.versao ? `v${status.versao}` : "—"}
          />
          <Linha
            rotulo="Wi-Fi"
            valor={
              status
                ? `${status.wifi ? `${status.wifi.trim() || status.wifi} · ` : ""}${status.rssi} dBm (${qualidadeSinal(status.rssi)})`
                : "—"
            }
            destaque={status && status.rssi < -80 ? "erro" : undefined}
          />
          <Linha rotulo="Conectado há" valor={duracao(estado.conectadaEm)} />
          <Linha
            rotulo="Impressora"
            valor={
              status?.impressoraIp
                ? `${status.impressoraIp} · ${status.impressoraOnline ? "online" : "offline"}`
                : "não encontrada"
            }
            destaque={status?.impressoraOnline ? "ok" : "erro"}
          />
          <Linha
            rotulo="Papel"
            valor={status ? PAPEL[status.papel] : "—"}
            destaque={
              status?.papel === "sem-papel" || status?.papel === "acabando"
                ? "erro"
                : undefined
            }
          />
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        fullWidth
        disabled={ocupado}
        onClick={() => void executar("redescobrir")}
      >
        {acao === "redescobrir" ? (
          "Procurando na rede do ESP32…"
        ) : (
          <>
            <RefreshCw size={15} strokeWidth={2.25} />
            Procurar impressora de novo
          </>
        )}
      </Button>

      <div className="space-y-2">
        <Label htmlFor="ponte-ip">Fixar IP da impressora (opcional)</Label>
        <div className="flex gap-2">
          <Input
            id="ponte-ip"
            autoComplete="off"
            inputMode="decimal"
            placeholder={status?.impressoraIp ?? "10.0.0.50"}
            leftIcon={<Printer size={17} strokeWidth={1.75} />}
            value={ipFixo}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setIpFixo(e.target.value)
            }
            disabled={ocupado}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={ocupado || !ipValido}
            onClick={() => void executar("ip")}
          >
            <Wifi size={15} strokeWidth={2.25} />
            {acao === "ip" ? "…" : "Fixar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
