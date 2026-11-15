import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { WebSocket } from 'ws';

jest.mock('../../infra/database/prisma-read.service.js', () => ({ PrismaReadService: class {} }));
jest.mock('../../infra/database/prisma-write.service.js', () => ({ PrismaWriteService: class {} }));
jest.mock('../../infra/websocket/websocket.gateway.js', () => ({ WebsocketGateway: class {} }));

import { ImpressoraForaError, PonteService } from './ponte.service.js';
import { CABECALHO, FRAME, frame, TAMANHO_PEDACO } from './ponte-protocolo.js';

const TOKEN = 'a'.repeat(64);
const MAC_A = [0x24, 0x6f, 0x28, 0xaa, 0xbb, 0x01];
const MAC_B = [0x24, 0x6f, 0x28, 0xaa, 0xbb, 0x02];

function statusPayload(mac: number[]) {
  const p = Buffer.alloc(21);
  p.writeUInt32BE(0x0a000032, 0);
  p[4] = 1;
  p.writeInt8(-55, 6);
  p.writeUInt32BE(200000, 7);
  Buffer.from(mac).copy(p, 15);
  return Buffer.concat([p, Buffer.from('1.0.0')]);
}

type EspFalso = {
  ws: WebSocket;
  recebidos: Buffer[];
  /** id -> bytes do job remontado (PARTE… + JOB) */
  jobs: Map<number, Buffer>;
  responder: 'ack' | 'nack' | 'mudo';
};

describe('PonteService (integração com WebSocket real)', () => {
  let server: Server;
  let porta: number;
  let ponte: PonteService;
  let banco: { ponteId: string | null };
  const emitidos: unknown[] = [];

  async function iniciar(ponteIdSalvo: string | null = null) {
    process.env.PONTE_IMPRESSORA_TOKEN = TOKEN;
    banco = { ponteId: ponteIdSalvo };
    const prismaRead = {
      configImpressora: { findUnique: jest.fn(() => Promise.resolve({ ponteId: banco.ponteId })) },
    };
    const prismaWrite = {
      configImpressora: {
        upsert: jest.fn(({ update }: { update: { ponteId: string } }) => {
          banco.ponteId = update.ponteId;
          return Promise.resolve(banco);
        }),
      },
    };
    const gateway = { emitirParaOperadores: (_e: string, p: unknown) => emitidos.push(p) };
    server = createServer();
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    porta = (server.address() as AddressInfo).port;
    ponte = new PonteService(
      { httpAdapter: { getHttpServer: () => server } } as never,
      prismaRead as never,
      prismaWrite as never,
      gateway as never,
    );
    await ponte.onApplicationBootstrap();
  }

  function conectarEsp(mac = MAC_A, token = TOKEN): Promise<EspFalso> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${porta}/ponte-impressora`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const esp: EspFalso = { ws, recebidos: [], jobs: new Map(), responder: 'ack' };
      const partes = new Map<number, Buffer[]>();
      ws.on('message', (dados: Buffer) => {
        esp.recebidos.push(dados);
        const tipo = dados[0];
        const id = dados.readUInt32BE(1);
        if (tipo === FRAME.PROBE) {
          ws.send(frame(FRAME.STATUS, 0, statusPayload(mac)));
        } else if (tipo === FRAME.PARTE || tipo === FRAME.JOB) {
          const lista = partes.get(id) ?? [];
          lista.push(dados.subarray(CABECALHO));
          partes.set(id, lista);
          if (tipo === FRAME.JOB) {
            esp.jobs.set(id, Buffer.concat(lista));
            partes.delete(id);
            if (esp.responder === 'ack') ws.send(frame(FRAME.ACK, id));
            if (esp.responder === 'nack') ws.send(frame(FRAME.NACK, id, Uint8Array.from([2])));
          }
        }
      });
      ws.once('open', () => resolve(esp));
      ws.once('unexpected-response', (_req, res) => reject(new Error(`HTTP ${res.statusCode}`)));
      ws.once('error', reject);
    });
  }

  async function ate(cond: () => boolean, ms = 2000) {
    const fim = Date.now() + ms;
    while (!cond()) {
      if (Date.now() > fim) throw new Error('timeout esperando condição');
      await new Promise((r) => setTimeout(r, 5));
    }
  }

  afterEach(async () => {
    ponte?.onModuleDestroy();
    await new Promise<void>((r) => server.close(() => r()));
    emitidos.length = 0;
  });

  it('recusa token inválido com 401', async () => {
    await iniciar();
    await expect(conectarEsp(MAC_A, 'b'.repeat(64))).rejects.toThrow('HTTP 401');
    expect(ponte.estado().conectada).toBe(false);
  });

  it('registra o primeiro ESP32 (TOFU), imprime e confirma por ACK', async () => {
    await iniciar();
    const esp = await conectarEsp();
    await ate(() => ponte.pronta);
    expect(banco.ponteId).toBe('24:6F:28:AA:BB:01');
    expect(ponte.estado()).toMatchObject({ conectada: true, autorizada: true });

    const cupom = Buffer.from('\x1b@CUPOM 1\n');
    await ponte.enviar(cupom, '316');
    expect(esp.jobs.get(316)?.equals(cupom)).toBe(true);
    esp.ws.close();
  });

  it('remonta job grande fragmentado (PARTE… + JOB)', async () => {
    await iniciar();
    const esp = await conectarEsp();
    await ate(() => ponte.pronta);
    const grande = Buffer.alloc(TAMANHO_PEDACO * 3 + 123, 7);
    await ponte.enviar(grande, 9);
    expect(esp.jobs.get(9)?.equals(grande)).toBe(true);
    expect(esp.recebidos.filter((f) => f[0] === FRAME.PARTE)).toHaveLength(3);
    esp.ws.close();
  });

  it('ESP32 com outro MAC não recebe cupom até ser aceito', async () => {
    await iniciar('24:6F:28:AA:BB:01');
    const esp = await conectarEsp(MAC_B);
    await ate(() => ponte.estado().macPendente !== null);
    expect(ponte.pronta).toBe(false);
    await expect(ponte.enviar(Buffer.from('x'), 1)).rejects.toThrow(/não está autorizado/);
    expect(esp.jobs.size).toBe(0);

    await ponte.aceitarDispositivo();
    expect(banco.ponteId).toBe('24:6F:28:AA:BB:02');
    await ponte.enviar(Buffer.from('ok'), 2);
    expect(esp.jobs.get(2)?.toString()).toBe('ok');
    esp.ws.close();
  });

  it('NACK vira erro com a causa; queda no meio rejeita o pendente', async () => {
    await iniciar();
    const esp = await conectarEsp();
    await ate(() => ponte.pronta);

    esp.responder = 'nack';
    const nack = ponte.enviar(Buffer.from('x'), 5);
    await expect(nack).rejects.toThrow(/recusou a conexão/);
    // impressora desligada: a fila pausa em vez de gastar tentativa
    await expect(nack).rejects.toMatchObject({ motivo: 'impressora' });
    await expect(nack).rejects.toBeInstanceOf(ImpressoraForaError);

    esp.responder = 'mudo';
    const pendente = ponte.enviar(Buffer.from('y'), 6);
    await ate(() => esp.jobs.has(6));
    esp.ws.terminate();
    await expect(pendente).rejects.toThrow(/desconectou/);
    await expect(pendente).rejects.toMatchObject({ motivo: 'ponte' });
    await ate(() => !ponte.estado().conectada);
  });

  it('aguardarPronta segura o job até o ESP32 reconectar', async () => {
    await iniciar('24:6F:28:AA:BB:01');
    const espera = ponte.aguardarPronta(3000);
    setTimeout(() => void conectarEsp(), 150);
    await expect(espera).resolves.toBe(true);
    expect(await ponte.aguardarPronta(10)).toBe(true);
  });

  it('carga: 2000 cupons em sequência (fila concurrency 1) com p95 baixo', async () => {
    await iniciar();
    const esp = await conectarEsp();
    await ate(() => ponte.pronta);
    const cupom = Buffer.alloc(2500, 0x41); // ~ cupom real de 2–7 itens
    const tempos: number[] = [];
    for (let i = 1; i <= 2000; i++) {
      const t0 = process.hrtime.bigint();
      await ponte.enviar(cupom, i);
      tempos.push(Number(process.hrtime.bigint() - t0) / 1e6);
    }
    tempos.sort((a, b) => a - b);
    const p = (q: number) => tempos[Math.floor(q * (tempos.length - 1))];
    console.log(
      `ponte loopback: n=2000 p50=${p(0.5).toFixed(2)}ms p95=${p(0.95).toFixed(2)}ms p99=${p(0.99).toFixed(2)}ms max=${p(1).toFixed(2)}ms`,
    );
    expect(esp.jobs.size).toBe(2000);
    expect(p(0.95)).toBeLessThan(20);
    esp.ws.close();
  });
});
