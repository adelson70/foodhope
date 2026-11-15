import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';

import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
import { WebsocketGateway } from '../../infra/websocket/websocket.gateway.js';
import { ImpressoraService } from './impressora.service.js';
import { PonteService } from './ponte.service.js';

export const EVENTO_FILA_IMPRESSAO = 'impressao:fila';
export const EVENTO_PEDIDO_IMPRESSAO = 'pedido:impressao';

/** Cupom que falhou há mais tempo que isso não entra no aviso nem no "reimprimir todos". */
const JANELA_NAO_IMPRESSOS_MS = 24 * 60 * 60 * 1000;

export type MotivoPausaImpressao = 'ponte' | 'impressora';

export type ResumoFilaImpressao = {
  usaPonte: boolean;
  ponteConectada: boolean;
  /** A fila está pausada porque a ponte respondeu que não alcança a impressora. */
  impressoraFora: boolean;
  /** Cupons ainda não impressos (esperando, imprimindo ou aguardando nova tentativa). */
  esperando: number;
  /** Pedidos de até 24 h, ainda não prontos, com cupom que esgotou as tentativas. */
  naoImpressos: number;
};

export function filtroNaoImpressos(): Prisma.PedidoWhereInput {
  return {
    impressaoFalhou: true,
    prontoAt: null,
    createdAt: { gte: new Date(Date.now() - JANELA_NAO_IMPRESSOS_MS) },
  };
}

/** Resumo da fila para o aviso do painel (ponte fora, cupons esperando, não impressos). */
@Injectable()
export class FilaImpressaoStatusService implements OnModuleDestroy {
  private readonly logger = new Logger(FilaImpressaoStatusService.name);
  private motivoPausa: MotivoPausaImpressao | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectQueue('fila-impressao') private readonly fila: Queue,
    private readonly impressora: ImpressoraService,
    private readonly ponte: PonteService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly gateway: WebsocketGateway,
  ) {}

  onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }

  /** Segura a fila inteira por `ms` (o job atual volta para o começo, sem gastar tentativa). */
  async pausar(motivo: MotivoPausaImpressao, ms: number) {
    await this.fila.rateLimit(ms);
    this.definirPausa(motivo);
  }

  definirPausa(motivo: MotivoPausaImpressao | null) {
    if (this.motivoPausa === motivo) return;
    this.motivoPausa = motivo;
    this.avisar();
  }

  async resumo(): Promise<ResumoFilaImpressao> {
    const [contagem, naoImpressos] = await Promise.all([
      this.fila.getJobCounts('wait', 'active', 'delayed', 'prioritized', 'paused'),
      this.prismaWrite.pedido.count({ where: filtroNaoImpressos() }),
    ]);
    const esperando = Object.values(contagem).reduce((soma, n) => soma + (n ?? 0), 0);
    return {
      usaPonte: this.impressora.usaPonte(),
      ponteConectada: this.ponte.pronta,
      impressoraFora: this.motivoPausa === 'impressora',
      esperando,
      naoImpressos,
    };
  }

  /** Manda o resumo aos operadores (agrupa várias mudanças seguidas num envio só). */
  avisar() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.resumo()
        .then((resumo) => this.gateway.emitirParaOperadores(EVENTO_FILA_IMPRESSAO, resumo))
        .catch((erro: unknown) =>
          this.logger.warn(`Não foi possível enviar o resumo da fila: ${String(erro)}`),
        );
    }, 300);
  }
}
