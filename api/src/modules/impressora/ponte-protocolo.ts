// Protocolo binário da ponte ESP32 (espelhado em firmware/ponte-impressora/ponte-impressora.ino).
// Frame: tipo u8 | id u32 BE | payload.

export const PONTE_CAMINHO = '/ponte-impressora';

export const FRAME = {
  JOB: 0x01, // API→ESP: último (ou único) pedaço de ESC/POS; o ESP imprime e responde ACK/NACK
  ACK: 0x02, // ESP→API
  NACK: 0x03, // ESP→API: payload u8 = código de erro
  STATUS: 0x04, // ESP→API
  PROBE: 0x05, // API→ESP: pede STATUS com consulta à impressora
  SET_IP: 0x06, // API→ESP: payload u32 = IP da impressora (0 = redescobrir)
  PARTE: 0x07, // API→ESP: pedaço intermediário de ESC/POS (mais pedaços virão)
} as const;

/** Abaixo do WEBSOCKETS_MAX_DATA_SIZE (15 KB) da biblioteca do ESP32. */
export const TAMANHO_PEDACO = 12 * 1024;
export const CABECALHO = 5;
export const TAMANHO_STATUS_MIN = 21;

export const ERROS_NACK: Record<number, string> = {
  1: 'ESP32 não encontrou a impressora na rede',
  2: 'A impressora recusou a conexão',
  3: 'Tempo esgotado escrevendo na impressora',
  4: 'Dispositivo não autorizado no painel',
};

export const PAPEL = { OK: 0, ACABANDO: 1, SEM_PAPEL: 2, DESCONHECIDO: 255 } as const;

export type StatusPonte = {
  impressoraIp: string | null;
  impressoraOnline: boolean;
  papel: 'ok' | 'acabando' | 'sem-papel' | 'desconhecido';
  rssi: number;
  heap: number;
  uptime: number;
  mac: string;
  versao: string;
  /** Rede Wi-Fi em que o ESP32 está (firmware 1.1.0+; null nos antigos). */
  wifi: string | null;
};

export function frame(tipo: number, id: number, payload?: Uint8Array): Buffer {
  const buf = Buffer.allocUnsafe(CABECALHO + (payload?.length ?? 0));
  buf[0] = tipo;
  buf.writeUInt32BE(id >>> 0, 1);
  if (payload) buf.set(payload, CABECALHO);
  return buf;
}

/** Divide o ESC/POS em PARTE…PARTE, JOB (o último sempre é JOB). */
export function framesDoJob(id: number, dados: Uint8Array): Buffer[] {
  if (dados.length <= TAMANHO_PEDACO) return [frame(FRAME.JOB, id, dados)];
  const frames: Buffer[] = [];
  for (let ini = 0; ini < dados.length; ini += TAMANHO_PEDACO) {
    const fim = Math.min(ini + TAMANHO_PEDACO, dados.length);
    frames.push(
      frame(fim === dados.length ? FRAME.JOB : FRAME.PARTE, id, dados.subarray(ini, fim)),
    );
  }
  return frames;
}

export function ipParaU32(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip.trim());
  if (!m) return null;
  const partes = m.slice(1).map(Number);
  if (partes.some((p) => p > 255)) return null;
  return ((partes[0] << 24) | (partes[1] << 16) | (partes[2] << 8) | partes[3]) >>> 0;
}

export function u32ParaIp(valor: number): string {
  return [valor >>> 24, (valor >>> 16) & 255, (valor >>> 8) & 255, valor & 255].join('.');
}

function papelDe(byte: number): StatusPonte['papel'] {
  if (byte === PAPEL.OK) return 'ok';
  if (byte === PAPEL.ACABANDO) return 'acabando';
  if (byte === PAPEL.SEM_PAPEL) return 'sem-papel';
  return 'desconhecido';
}

/** payload: ip u32 | online u8 | papel u8 | rssi i8 | heap u32 | uptime u32 | mac[6] | versão utf8 */
/** Depois do MAC: versão e, a partir da 1.1.0, um byte 0 seguido do nome da rede Wi-Fi. */
function versaoEWifi(resto: Buffer): { versao: string; wifi: string | null } {
  const zero = resto.indexOf(0);
  const versao = (zero < 0 ? resto : resto.subarray(0, zero)).subarray(0, 32);
  const wifi =
    zero < 0
      ? null
      : resto
          .subarray(zero + 1, zero + 1 + 32)
          .toString('utf8')
          .split('')
          .filter((c) => c >= ' ' && c !== '\u007f')
          .join('');
  return {
    versao: versao.toString('utf8').replace(/[^\x20-\x7e]/g, ''),
    wifi: wifi || null,
  };
}

export function lerStatus(payload: Buffer): StatusPonte | null {
  if (payload.length < TAMANHO_STATUS_MIN) return null;
  const ip = payload.readUInt32BE(0);
  const mac = Array.from(payload.subarray(15, 21), (b) => b.toString(16).padStart(2, '0'))
    .join(':')
    .toUpperCase();
  return {
    impressoraIp: ip === 0 ? null : u32ParaIp(ip),
    impressoraOnline: payload[4] === 1,
    papel: papelDe(payload[5]),
    rssi: payload.readInt8(6),
    heap: payload.readUInt32BE(7),
    uptime: payload.readUInt32BE(11),
    mac,
    ...versaoEWifi(payload.subarray(21)),
  };
}

/** Id do frame a partir do id do job BullMQ (numérico); ids locais (testes) usam a faixa alta. */
let seqLocal = 0;
export function idDoFrame(jobId?: string | number | null): number {
  const n = typeof jobId === 'number' ? jobId : Number(jobId);
  if (Number.isSafeInteger(n) && n > 0) return n % 0x80000000;
  seqLocal = (seqLocal + 1) % 0x7fffffff;
  return (0x80000000 + seqLocal) >>> 0;
}
