import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { KeyRound, Usb, Wifi } from "lucide-react";

import { Button, Input, Label, Select } from "../../../components/ui";
import { cn } from "../../../lib/cn";

// Web Serial (Chrome/Edge no computador). Tipos mínimos para não depender de @types extras.
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
const FILTROS = [0x10c4, 0x1a86, 0x0403, 0x303a].map((usbVendorId) => ({
  usbVendorId,
}));

type Rede = { ssid: string; rssi: number };
type Etapa =
  | "inicio"
  | "conectando"
  | "procurando"
  | "escolher"
  | "gravando"
  | "ok"
  | "erro";

/** Conexão serial com o firmware da ponte: linhas que começam com "@" são respostas. */
class Esp32Usb {
  private linhas: string[] = [];
  private ouvintes = new Set<() => void>();
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
    let resto = "";
    this.leitor = this.porta.readable?.getReader() ?? null;
    if (!this.leitor) return;
    try {
      for (;;) {
        const { value, done } = await this.leitor.read();
        if (done) break;
        resto += dec.decode(value, { stream: true });
        const partes = resto.split(/\r?\n/);
        resto = partes.pop() ?? "";
        for (const l of partes) if (l.startsWith("@")) this.linhas.push(l);
        this.ouvintes.forEach((f) => f());
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

  /** Espera uma linha que satisfaça `teste`; devolve as linhas consumidas até ela. */
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
        reject(new Error("O ESP32 não respondeu pela USB."));
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

  async fechar() {
    await this.leitor?.cancel().catch(() => {});
    this.leitor?.releaseLock();
    await this.porta.close().catch(() => {});
  }
}

export function WifiUsbEsp32({ disabled }: { disabled?: boolean }) {
  const [etapa, setEtapa] = useState<Etapa>("inicio");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [ssid, setSsid] = useState("");
  const [senha, setSenha] = useState("");
  const esp = useRef<Esp32Usb | null>(null);
  const serial = serialDoNavegador();

  useEffect(
    () => () => {
      void esp.current?.fechar();
    },
    [],
  );

  if (!serial) {
    return (
      <p className="px-1 text-caption text-on-surface-variant">
        Para trocar o Wi-Fi do ESP32 pela USB, abra o painel no Chrome ou Edge
        de um computador.
      </p>
    );
  }

  async function procurar(conexao: Esp32Usb) {
    setEtapa("procurando");
    conexao.descartar();
    await conexao.enviar("scan");
    const linhas = await conexao.esperar((l) => l === "@fim", 30_000);
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
      const porta = await serial!.requestPort({ filters: FILTROS });
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
      conexao.descartar();
      await conexao.enviar(`wifi\t${ssid}\t${senha}`);
      await conexao.esperar((l) => l === "@salvo", 5_000);
      // reinicia e tenta a rede salva primeiro (até 20 s)
      const [resultado] = (
        await conexao.esperar(
          (l) =>
            l.startsWith("@wifi-ok") || l.startsWith(`@wifi-falhou\t${ssid}\t`),
          45_000,
        )
      ).slice(-1);
      if (resultado.startsWith("@wifi-ok")) {
        const [, rede, ip] = resultado.split("\t");
        setEtapa("ok");
        setMensagem(
          `Conectado em "${rede}" (${ip}). Já pode tirar da USB e ligar na tomada perto da impressora.`,
        );
        setSenha("");
      } else {
        setEtapa("escolher");
        setMensagem(
          `Não conectou em "${ssid}". Confira a senha (e se a rede é 2,4 GHz).`,
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
        <Usb size={18} strokeWidth={1.75} />
        Wi-Fi do ESP32 pela USB
      </div>

      {etapa === "inicio" || etapa === "conectando" || etapa === "erro" ? (
        <>
          <p className="text-caption text-on-surface-variant">
            Ligue o ESP32 neste computador com o cabo USB para escolher a rede
            Wi-Fi do restaurante.
          </p>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled={ocupado}
            onClick={() => void conectar()}
          >
            {etapa === "conectando" ? "Conectando…" : "Conectar ESP32 pela USB"}
          </Button>
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
              {etapa === "gravando" ? "Conectando o ESP32…" : "Gravar Wi-Fi"}
            </Button>
          </div>
        </>
      ) : null}

      {etapa === "ok" ? (
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={() =>
            esp.current &&
            void procurar(esp.current).catch(() => setEtapa("erro"))
          }
        >
          Trocar de rede de novo
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
