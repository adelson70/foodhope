import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { Socket } from 'node:net';
import { networkInterfaces } from 'node:os';

/** Identifica este processo da API; o /health devolve no header abaixo. */
export const INSTANCIA_API = randomUUID();
export const HEADER_INSTANCIA = 'x-foodhope-instancia';

export const PORTA_IMPRESSORA_REDE = 9100;

const PREFIXO_MINIMO = 22; // no máximo 1022 hosts por rede
const TIMEOUT_MS = 700;
const CONCORRENCIA = 128;

export type RedeIpv4 = { cidr: string; inicio: number; fim: number };

function ipParaNumero(ip: string): number | null {
  const partes = ip.split('.');
  if (partes.length !== 4) return null;
  let numero = 0;
  for (const parte of partes) {
    if (!/^\d{1,3}$/.test(parte)) return null;
    const octeto = Number(parte);
    if (octeto > 255) return null;
    numero = numero * 256 + octeto;
  }
  return numero;
}

function numeroParaIp(numero: number): string {
  return [24, 16, 8, 0].map((desloc) => Math.floor(numero / 2 ** desloc) % 256).join('.');
}

function prefixoDaMascara(mascara: string): number | null {
  const numero = ipParaNumero(mascara);
  if (numero === null) return null;
  const bits = numero.toString(2).padStart(32, '0');
  if (!/^1*0*$/.test(bits)) return null;
  return bits.replace(/0/g, '').length;
}

function montarRede(ip: string, prefixo: number): RedeIpv4 | null {
  const numero = ipParaNumero(ip);
  if (numero === null || prefixo < PREFIXO_MINIMO || prefixo > 30) return null;
  const tamanho = 2 ** (32 - prefixo);
  const base = numero - (numero % tamanho);
  return {
    cidr: `${numeroParaIp(base)}/${prefixo}`,
    inicio: base + 1,
    fim: base + tamanho - 2,
  };
}

/** Aceita "192.168.1.0/24" ou só um IP ("192.168.1.50", vira o /24 dele). */
export function parseCidr(cidr: string): RedeIpv4 | null {
  const match = cidr.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?$/);
  if (!match) return null;
  return montarRede(match[1], match[2] ? Number(match[2]) : 24);
}

/** Redes das interfaces IPv4 não-internas da máquina (ou do container). */
export function redesDasInterfaces(): RedeIpv4[] {
  const redes: RedeIpv4[] = [];
  for (const enderecos of Object.values(networkInterfaces())) {
    for (const endereco of enderecos ?? []) {
      if (endereco.family !== 'IPv4' || endereco.internal) continue;
      const prefixo = prefixoDaMascara(endereco.netmask);
      if (prefixo === null) continue;
      // Redes maiores que /22 são limitadas ao /24 do próprio IP
      const rede = montarRede(endereco.address, Math.max(prefixo, 24));
      if (rede) redes.push(rede);
    }
  }
  return redes;
}

function portaAberta(host: string, porta: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket();
    const finalizar = (aberta: boolean) => {
      socket.destroy();
      resolve(aberta);
    };
    socket.setTimeout(TIMEOUT_MS);
    socket.once('connect', () => finalizar(true));
    socket.once('timeout', () => finalizar(false));
    socket.once('error', () => finalizar(false));
    socket.connect(porta, host);
  });
}

/** Varre as redes procurando hosts com a porta de impressão RAW (9100) aberta. */
export async function varrerRedes(redes: RedeIpv4[], porta = PORTA_IMPRESSORA_REDE) {
  const hosts = new Set<number>();
  for (const rede of redes) {
    for (let n = rede.inicio; n <= rede.fim; n++) hosts.add(n);
  }

  const fila = [...hosts];
  const encontrados: number[] = [];

  async function trabalhador() {
    for (let n = fila.shift(); n !== undefined; n = fila.shift()) {
      if (await portaAberta(numeroParaIp(n), porta)) encontrados.push(n);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCORRENCIA, fila.length) }, trabalhador));

  return encontrados.sort((a, b) => a - b).map((n) => numeroParaIp(n));
}

/** IPs IPv4 da própria máquina (ou container) onde a API roda. */
export function ipsLocais(): Set<string> {
  const ips = new Set<string>();
  for (const enderecos of Object.values(networkInterfaces())) {
    for (const endereco of enderecos ?? []) {
      if (endereco.family === 'IPv4') ips.add(endereco.address);
    }
  }
  return ips;
}

/**
 * True se o host responde o /health desta mesma instância da API,
 * ou seja, é a máquina do servidor (IP da LAN do host, gateway do Docker…).
 */
export async function ehMaquinaDaApi(host: string): Promise<boolean> {
  const portas = new Set(
    [process.env.PORT, process.env.API_PUBLISH_PORT, '5000'].filter((porta): porta is string =>
      Boolean(porta && /^\d+$/.test(porta)),
    ),
  );

  for (const porta of portas) {
    try {
      const resposta = await fetch(`http://${host}:${porta}/health`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (resposta.headers.get(HEADER_INSTANCIA) === INSTANCIA_API) return true;
    } catch {
      // porta fechada ou não é a API
    }
  }
  return false;
}

function dentroDaRede(host: string, rede: RedeIpv4): boolean {
  const numero = ipParaNumero(host);
  return numero !== null && numero >= rede.inicio - 1 && numero <= rede.fim + 1;
}

/**
 * Em container, as redes das interfaces são as redes internas do Docker
 * (geradas pelo servidor), não a LAN: nada nelas é impressora real.
 */
export function ehRedeInternaDoServidor(host: string): boolean {
  if (!existsSync('/.dockerenv')) return false;
  return redesDasInterfaces().some((rede) => dentroDaRede(host, rede));
}
