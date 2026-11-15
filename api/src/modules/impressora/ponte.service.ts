import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';

import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { WebSocket, WebSocketServer, type RawData } from 'ws';

import { PrismaReadService } from '../../infra/database/prisma-read.service.js';
import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
import { WebsocketGateway } from '../../infra/websocket/websocket.gateway.js';
import {
  CABECALHO,
  ERROS_NACK,
  FRAME,
  frame,
  framesDoJob,
  idDoFrame,
  ipParaU32,
  lerStatus,
  PONTE_CAMINHO,
  type StatusPonte,
} from './ponte-protocolo.js';

const CONFIG_ID = 'default';
const TIMEOUT_ACK_MS = 10_000;
const INTERVALO_PING_MS = 15_000;
const TAMANHO_MAX_FRAME = 64 * 1024;
const TOKEN_MIN = 32;

type Pendente = {
  resolve: () => void;
  reject: (erro: Error) => void;
  timer: NodeJS.Timeout;
};

export type EstadoPonte = {
  habilitada: boolean;
  conectada: boolean;
  autorizada: boolean;
  macPendente: string | null;
  macAutorizado: string | null;
  conectadaEm: string | null;
  origem: string | null;
  statusEm: string | null;
  status: StatusPonte | null;
};

export const EVENTO_PONTE_STATUS = 'ponte:status';

/** NACKs em que a impressora está desligada/fora da rede (não é defeito do cupom). */
const NACK_IMPRESSORA_FORA = new Set([1, 2]);

/**
 * Ponte ou impressora sem energia/rede. A fila de impressão pausa em vez de gastar tentativa:
 * o cupom espera o tempo que for preciso e sai na ordem quando o equipamento voltar.
 */
export class ImpressoraForaError extends Error {
  constructor(
    mensagem: string,
    readonly motivo: 'ponte' | 'impressora',
  ) {
    super(mensagem);
    this.name = 'ImpressoraForaError';
  }
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest();
}

@Injectable()
export class PonteService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(PonteService.name);
  private readonly tokenHash: Buffer | null;
  private readonly wss = new WebSocketServer({
    noServer: true,
    maxPayload: TAMANHO_MAX_FRAME,
    perMessageDeflate: false,
  });

  private ws: WebSocket | null = null;
  private vivo = false;
  private ping: NodeJS.Timeout | null = null;
  private macAutorizado: string | null = null;
  private status: StatusPonte | null = null;
  private statusEm: Date | null = null;
  private conectadaEm: Date | null = null;
  private origem: string | null = null;
  private readonly pendentes = new Map<number, Pendente>();
  private esperandoStatus: Array<() => void> = [];

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly gateway: WebsocketGateway,
  ) {
    const token = process.env.PONTE_IMPRESSORA_TOKEN?.trim() ?? '';
    this.tokenHash = token.length >= TOKEN_MIN ? hashToken(token) : null;
  }

  async onApplicationBootstrap() {
    if (!this.tokenHash) {
      this.logger.warn(
        `Ponte ESP32 desativada: defina PONTE_IMPRESSORA_TOKEN (mínimo ${TOKEN_MIN} caracteres).`,
      );
    }

    try {
      const config = await this.prismaRead.configImpressora.findUnique({
        where: { id: CONFIG_ID },
        select: { ponteId: true },
      });
      this.macAutorizado = config?.ponteId ?? null;
    } catch (erro) {
      this.logger.error('Não foi possível carregar o ESP32 autorizado', erro);
    }

    const server = this.adapterHost.httpAdapter?.getHttpServer() as Server | undefined;
    server?.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) =>
      this.upgrade(req, socket, head),
    );
  }

  onModuleDestroy() {
    if (this.ping) clearInterval(this.ping);
    this.ws?.terminate();
    this.wss.close();
  }

  // ---------- estado ----------

  get pronta() {
    return this.ws?.readyState === WebSocket.OPEN && this.autorizada;
  }

  private get autorizada() {
    return !!this.status && this.status.mac === this.macAutorizado;
  }

  estado(): EstadoPonte {
    const conectada = this.ws?.readyState === WebSocket.OPEN;
    return {
      habilitada: !!this.tokenHash,
      conectada,
      autorizada: conectada && this.autorizada,
      macPendente: conectada && this.status && !this.autorizada ? this.status.mac : null,
      macAutorizado: this.macAutorizado,
      conectadaEm: conectada ? (this.conectadaEm?.toISOString() ?? null) : null,
      origem: conectada ? this.origem : null,
      statusEm: this.statusEm?.toISOString() ?? null,
      status: this.status,
    };
  }

  private emitirEstado() {
    try {
      this.gateway.emitirParaOperadores(EVENTO_PONTE_STATUS, this.estado());
    } catch {
      // gateway ainda não inicializado
    }
  }

  // ---------- conexão ----------

  private upgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    const caminho = (req.url ?? '').split('?')[0];
    if (caminho !== PONTE_CAMINHO) return; // socket.io e outros seguem o fluxo deles

    const origem =
      (req.headers['cf-connecting-ip'] as string | undefined) ?? req.socket.remoteAddress ?? '?';

    if (!this.tokenHash) {
      socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
      return;
    }

    const auth = req.headers.authorization ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token || !timingSafeEqual(hashToken(token), this.tokenHash)) {
      this.logger.warn(`Ponte: conexão recusada (token inválido) de ${origem}`);
      socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      return;
    }

    this.wss.handleUpgrade(req, socket, head, (ws) => this.conectar(ws, origem));
  }

  private conectar(ws: WebSocket, origem: string) {
    if (this.ws) {
      this.logger.warn('Ponte: nova conexão substitui a anterior');
      this.ws.close(4000, 'substituida');
      this.desconectado(this.ws);
    }

    this.ws = ws;
    this.vivo = true;
    this.status = null;
    this.conectadaEm = new Date();
    this.origem = origem;
    this.logger.log(`Ponte ESP32 conectada de ${origem}`);

    ws.on('message', (dados, binario) => this.mensagem(ws, dados, binario));
    ws.on('pong', () => (this.vivo = true));
    // o ESP32 também manda ping a cada 15 s (heartbeat): conta como sinal de vida
    ws.on('ping', () => (this.vivo = true));
    ws.on('close', () => this.desconectado(ws));
    ws.on('error', (erro) => this.logger.warn(`Ponte: erro no socket: ${erro.message}`));

    if (this.ping) clearInterval(this.ping);
    this.ping = setInterval(() => {
      if (this.ws !== ws) return;
      if (!this.vivo) {
        this.logger.warn('Ponte: sem resposta ao ping, encerrando conexão');
        ws.terminate();
        return;
      }
      this.vivo = false;
      ws.ping();
    }, INTERVALO_PING_MS);

    ws.send(frame(FRAME.PROBE, 0));
    this.emitirEstado();
  }

  private desconectado(ws: WebSocket) {
    if (this.ws !== ws) return;
    this.ws = null;
    if (this.ping) clearInterval(this.ping);
    this.ping = null;
    for (const [id, p] of this.pendentes) {
      clearTimeout(p.timer);
      p.reject(new ImpressoraForaError('A ponte ESP32 desconectou durante a impressão', 'ponte'));
      this.pendentes.delete(id);
    }
    this.logger.warn('Ponte ESP32 desconectada');
    this.emitirEstado();
  }

  private mensagem(ws: WebSocket, dados: RawData, binario: boolean) {
    if (this.ws !== ws || !binario) return;
    this.vivo = true;
    const buf = Array.isArray(dados) ? Buffer.concat(dados) : Buffer.from(dados as ArrayBuffer);
    if (buf.length < CABECALHO) return;

    const tipo = buf[0];
    const id = buf.readUInt32BE(1);

    if (tipo === FRAME.ACK || tipo === FRAME.NACK) {
      const p = this.pendentes.get(id);
      if (!p) return;
      clearTimeout(p.timer);
      this.pendentes.delete(id);
      if (tipo === FRAME.ACK) {
        p.resolve();
        return;
      }
      const codigo = buf[CABECALHO];
      const mensagem = ERROS_NACK[codigo] ?? 'A ponte ESP32 não conseguiu imprimir';
      p.reject(
        NACK_IMPRESSORA_FORA.has(codigo)
          ? new ImpressoraForaError(mensagem, 'impressora')
          : new Error(mensagem),
      );
      return;
    }

    if (tipo === FRAME.STATUS) {
      const status = lerStatus(buf.subarray(CABECALHO));
      if (!status) return;
      void this.registrarStatus(status);
    }
  }

  private async registrarStatus(status: StatusPonte) {
    const primeiro = !this.status;
    this.status = status;
    this.statusEm = new Date();

    if (!this.macAutorizado) {
      // primeiro ESP32 autenticado por token fica registrado (trust on first use)
      try {
        await this.prismaWrite.configImpressora.upsert({
          where: { id: CONFIG_ID },
          create: { id: CONFIG_ID, ponteId: status.mac },
          update: { ponteId: status.mac },
        });
        this.macAutorizado = status.mac;
        this.logger.log(`Ponte: ESP32 ${status.mac} registrado como dispositivo autorizado`);
      } catch (erro) {
        this.logger.error('Ponte: não foi possível registrar o ESP32', erro);
      }
    } else if (primeiro && status.mac !== this.macAutorizado) {
      this.logger.warn(
        `Ponte: ESP32 ${status.mac} tem token válido, mas não é o autorizado (${this.macAutorizado}). Aceite no painel.`,
      );
    }

    const esperando = this.esperandoStatus;
    this.esperandoStatus = [];
    for (const resolver of esperando) resolver();
    this.emitirEstado();
  }

  // ---------- operações ----------

  private proximoStatus(ms: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.esperandoStatus = this.esperandoStatus.filter((r) => r !== pronto);
        resolve(false);
      }, ms);
      const pronto = () => {
        clearTimeout(timer);
        resolve(true);
      };
      this.esperandoStatus.push(pronto);
    });
  }

  /** Espera a ponte ficar conectada e autorizada (para jobs da fila durante quedas curtas). */
  async aguardarPronta(ms: number): Promise<boolean> {
    const limite = Date.now() + ms;
    while (!this.pronta) {
      const resta = limite - Date.now();
      if (resta <= 0) return false;
      await this.proximoStatus(resta);
    }
    return true;
  }

  async enviar(dados: Buffer, jobId?: string | number | null): Promise<void> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new ServiceUnavailableException('A ponte ESP32 não está conectada.');
    }
    if (!this.autorizada) {
      throw new ServiceUnavailableException(
        'O ESP32 conectado não está autorizado. Aceite o dispositivo em Configurações > Impressora.',
      );
    }

    const id = idDoFrame(jobId);
    const anterior = this.pendentes.get(id);
    if (anterior) {
      clearTimeout(anterior.timer);
      anterior.reject(new Error('Reenviado'));
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendentes.delete(id);
        reject(new Error('A ponte ESP32 não confirmou a impressão a tempo'));
      }, TIMEOUT_ACK_MS);
      this.pendentes.set(id, { resolve, reject, timer });
      for (const f of framesDoJob(id, dados)) ws.send(f);
    });
  }

  async sondar(ms = 4000): Promise<EstadoPonte> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const espera = this.proximoStatus(ms);
      this.ws.send(frame(FRAME.PROBE, 0));
      await espera;
    }
    return this.estado();
  }

  /** ip vazio/null = redescobrir na rede. */
  async definirIp(ip: string | null, ms = 8000): Promise<EstadoPonte> {
    const valor = ip ? ipParaU32(ip) : 0;
    if (valor === null) throw new Error('IP inválido');
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new ServiceUnavailableException('A ponte ESP32 não está conectada.');
    }
    const payload = Buffer.allocUnsafe(4);
    payload.writeUInt32BE(valor, 0);
    const espera = this.proximoStatus(ms);
    this.ws.send(frame(FRAME.SET_IP, 0, payload));
    await espera;
    return this.estado();
  }

  async aceitarDispositivo(): Promise<EstadoPonte> {
    const mac = this.estado().macPendente;
    if (!mac) return this.estado();
    await this.prismaWrite.configImpressora.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, ponteId: mac },
      update: { ponteId: mac },
    });
    this.macAutorizado = mac;
    this.logger.log(`Ponte: ESP32 ${mac} aceito pelo painel`);
    this.emitirEstado();
    const esperando = this.esperandoStatus;
    this.esperandoStatus = [];
    for (const resolver of esperando) resolver();
    return this.estado();
  }
}
