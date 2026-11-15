import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { KeyRound, Usb, Wifi } from "lucide-react";

import { Button, Input, Label, Select } from "../../../components/ui";
import { cn } from "../../../lib/cn";

// Configura o Wi-Fi do ESP32 pela USB (Web Serial). Pelo celular, sem computador, use o app
// "ESP BLE Provisioning" (ver DEPLOY.md). Respostas do firmware começam com "@".

// ---------- Web Serial (Chrome/Edge no computador) ----------
type PortaSerial = {
  open(o: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  setSignals(s: {
    dataTerminalReady?: boolean;
    requestToSend?: boolean;
  }): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
};
type SerialNav = {
  requestPort(o?: {
    filters?: { usbVendorId: number }[];
  }): Promise<PortaSerial>;
};

function serialDoNavegador(): SerialNav | null {
  return (navigator as Navigator & { serial?: SerialNav }).serial ?? null;
}

// CP210x, CH340, FTDI e USB nativo da Espressif
const FILTROS_USB = [0x10c4, 0x1a86, 0x0403, 0x303a].map((usbVendorId) => ({
  usbVendorId,
}));

/** Linhas "@..." recebidas, com espera por uma resposta específica. */
class Linhas {
  private linhas: string[] = [];
  private ouvintes = new Set<() => void>();
  private resto = "";

  receber(texto: string) {
    this.resto += texto;
    const partes = this.resto.split(/\r?\n/);
    this.resto = partes.pop() ?? "";
    for (const l of partes) if (l.startsWith("@")) this.linhas.push(l);
    this.ouvintes.forEach((f) => f());
  }

  esperar(teste: (l: string) => boolean, ms: number): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const verificar = () => {
        const i = this.linhas.findIndex(teste);
        if (i < 0) return;
        const lidas = this.linhas.splice(0, i + 1);
        fim();
        resolve(lidas);
      };
      const timer = setTimeout(() => {
        fim();
        reject(new Error("O ESP32 não respondeu."));
      }, ms);
      const fim = () => {
        clearTimeout(timer);
        this.ouvintes.delete(verificar);
      };
      this.ouvintes.add(verificar);
      verificar();
    });
  }

  descartar() {
    this.linhas = [];
  }
}

interface ConexaoEsp32 {
  readonly via: "usb";
  readonly linhas: Linhas;
  enviar(texto: string): Promise<void>;
  fechar(): Promise<void>;
}

class Esp32Usb implements ConexaoEsp32 {
  readonly via = "usb" as const;
  readonly linhas = new Linhas();
  private leitor: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private porta: PortaSerial;

  constructor(porta: PortaSerial) {
    this.porta = porta;
  }

  async abrir() {
    await this.porta.open({ baudRate: 115200 });
    // DTR/RTS em repouso = ESP32 rodando normalmente (sem entrar em modo de gravação)
    await this.porta
      .setSignals({ dataTerminalReady: false, requestToSend: false })
      .catch(() => {});
    void this.ler();
  }

  private async ler() {
    const dec = new TextDecoder();
    this.leitor = this.porta.readable?.getReader() ?? null;
    if (!this.leitor) return;
    try {
      for (;;) {
        const { value, done } = await this.leitor.read();
        if (done) break;
        this.linhas.receber(dec.decode(value, { stream: true }));
      }
    } catch {
      // porta fechada ou cabo removido
    }
  }

  async enviar(texto: string) {
    const w = this.porta.writable?.getWriter();
    if (!w) throw new Error("Porta USB indisponível.");
    await w.write(new TextEncoder().encode(texto + "\n"));
    w.releaseLock();
  }

  async fechar() {
    await this.leitor?.cancel().catch(() => {});
    this.leitor?.releaseLock();
    await this.porta.close().catch(() => {});
  }
}

type Rede = { ssid: string; rssi: number };
type Etapa =
  | "inicio"
  | "conectando"
  | "procurando"
  | "escolher"
  | "gravando"
  | "ok"
  | "erro";

export function WifiEsp32({ disabled }: { disabled?: boolean }) {
  const [etapa, setEtapa] = useState<Etapa>("inicio");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [ssid, setSsid] = useState("");
  const [senha, setSenha] = useState("");
  const esp = useRef<ConexaoEsp32 | null>(null);
  const serial = serialDoNavegador();

  useEffect(
    () => () => {
      void esp.current?.fechar();
    },
    [],
  );

  async function procurar(conexao: ConexaoEsp32) {
    setEtapa("procurando");
    conexao.linhas.descartar();
    await conexao.enviar("scan");
    const linhas = await conexao.linhas.esperar((l) => l === "@fim", 30_000);
    const vistas = new Map<string, number>();
    for (const l of linhas) {
      const [tipo, nome, rssi] = l.split("\t");
      if (tipo !== "@rede" || !nome) continue;
      vistas.set(nome, Math.max(Number(rssi), vistas.get(nome) ?? -999));
    }
    const lista = [...vistas]
      .map(([n, r]) => ({ ssid: n, rssi: r }))
      .sort((a, b) => b.rssi - a.rssi);
    setRedes(lista);
    setSsid((atual) => atual || lista[0]?.ssid || "");
    setEtapa("escolher");
  }

  async function conectar() {
    setMensagem(null);
    setEtapa("conectando");
    try {
      await esp.current?.fechar();
      const porta = await serial!.requestPort({ filters: FILTROS_USB });
      const conexao = new Esp32Usb(porta);
      await conexao.abrir();
      esp.current = conexao;
      await procurar(conexao);
    } catch (e) {
      // usuário fechou a janela de escolha da porta
      if (e instanceof DOMException && e.name === "NotFoundError") {
        setEtapa("inicio");
        return;
      }
      setEtapa("erro");
      setMensagem(
        e instanceof Error && e.message.includes("respond")
          ? e.message + " Confira se é o ESP32 da ponte e tente de novo."
          : "Não foi possível abrir a USB. Feche outros programas que usam a porta (ex.: monitor serial).",
      );
    }
  }

  async function gravar() {
    const conexao = esp.current;
    if (!conexao) return;
    setMensagem(null);
    setEtapa("gravando");
    try {
      conexao.linhas.descartar();
      await conexao.enviar(`wifi\t${ssid}\t${senha}`);
      // o ESP32 testa a rede na hora (até ~20 s) e só grava se conectar
      const [resultado] = (
        await conexao.linhas.esperar(
          (l) =>
            l.startsWith("@wifi-ok") ||
            l.startsWith(`@wifi-falhou\t${ssid}\t`) ||
            l.startsWith("@erro"),
          45_000,
        )
      ).slice(-1);
      if (resultado.startsWith("@wifi-ok")) {
        const [, rede, ip] = resultado.split("\t");
        setEtapa("ok");
        setMensagem(
          `Conectado em "${rede}" (${ip}). O ESP32 reinicia sozinho e em cerca de 1 minuto aparece online aqui.`,
        );
        setSenha("");
      } else {
        const [, , , texto] = resultado.split("\t");
        setEtapa("escolher");
        setMensagem(
          resultado.startsWith("@erro")
            ? (resultado.split("\t")[1] ?? "O ESP32 recusou o pedido.")
            : `Não conectou em "${ssid}": ${texto ?? "confira a senha"}.`,
        );
      }
    } catch (e) {
      setEtapa("escolher");
      setMensagem(e instanceof Error ? e.message : "Falha ao gravar.");
    }
  }

  const caracteresInvalidos = /[\t\r\n]/.test(ssid + senha);
  const ocupado =
    disabled ||
    etapa === "conectando" ||
    etapa === "procurando" ||
    etapa === "gravando";

  return (
    <div className="space-y-3 rounded-xl border border-operator-border bg-operator-card p-4">
      <div className="flex items-center gap-2 text-body-md font-medium text-on-surface">
        <Wifi size={18} strokeWidth={1.75} />
        Wi-Fi do ESP32
      </div>

      {etapa === "inicio" || etapa === "conectando" || etapa === "erro" ? (
        <>
          <p className="text-caption text-on-surface-variant">
            Pelo celular, com o ESP32 só na tomada: app{" "}
            <b>ESP BLE Provisioning</b> (Android/iPhone) nos 2 primeiros minutos
            depois de ligar. Por aqui: ligue o ESP32 na USB deste computador.
          </p>
          {serial ? (
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={ocupado}
              onClick={() => void conectar()}
            >
              <Usb size={15} strokeWidth={2.25} />
              {etapa === "conectando"
                ? "Conectando…"
                : "Conectar ESP32 pela USB"}
            </Button>
          ) : (
            <p className="text-caption text-on-surface-variant">
              Para configurar pela USB, abra o painel no Chrome ou Edge de um
              computador.
            </p>
          )}
        </>
      ) : null}

      {etapa === "procurando" ? (
        <p className="text-caption text-on-surface-variant">
          Procurando redes Wi-Fi…
        </p>
      ) : null}

      {etapa === "escolher" || etapa === "gravando" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="esp-ssid">Rede (2,4 GHz)</Label>
            <Select
              id="esp-ssid"
              value={ssid}
              onChange={setSsid}
              options={redes.map((r) => ({
                value: r.ssid,
                label: r.ssid.trim() || r.ssid,
                description: `${r.rssi} dBm`,
              }))}
              placeholder="Escolha a rede"
              disabled={ocupado}
              fullWidth
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="esp-senha">Senha</Label>
            <Input
              id="esp-senha"
              type="password"
              autoComplete="off"
              leftIcon={<KeyRound size={17} strokeWidth={1.75} />}
              value={senha}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setSenha(e.target.value)
              }
              disabled={ocupado}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={ocupado}
              onClick={() =>
                esp.current &&
                void procurar(esp.current).catch(() => setEtapa("escolher"))
              }
            >
              Atualizar
            </Button>
            <Button
              type="button"
              fullWidth
              disabled={ocupado || !ssid || caracteresInvalidos}
              onClick={() => void gravar()}
            >
              <Wifi size={15} strokeWidth={2.25} />
              {etapa === "gravando" ? "Testando a rede…" : "Conectar o ESP32"}
            </Button>
          </div>
        </>
      ) : null}

      {etapa === "ok" ? (
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={() => {
            setMensagem(null);
            setEtapa("inicio");
          }}
        >
          Configurar de novo
        </Button>
      ) : null}

      {mensagem ? (
        <p
          className={cn(
            "text-caption",
            etapa === "ok" ? "text-success" : "text-danger",
          )}
        >
          {mensagem}
        </p>
      ) : null}
    </div>
  );
}
