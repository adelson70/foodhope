import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Worker } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ImpressoraService } from './impressora.service.js';
import { ImpressoraForaError, PonteService } from './ponte.service.js';
import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
import { WebsocketGateway } from '../../infra/websocket/websocket.gateway.js';
import {
  EVENTO_PEDIDO_IMPRESSAO,
  FilaImpressaoStatusService,
} from './fila-impressao-status.service.js';

/** Queda curta da ponte (Wi-Fi/ESP32 reiniciando): segura o job antes de pausar a fila. */
const ESPERA_PONTE_MS = 30_000;
/** Pausa da fila quando a ponte ou a impressora estão fora (queda de energia, rede...). */
const PAUSA_PONTE_MS = 2_000;
const PAUSA_IMPRESSORA_MS = 15_000;

type DadosJob = { texto: string; pedidoId?: string };

@Processor('fila-impressao', { concurrency: 1 })
export class ImpressaoProcessor extends WorkerHost {
  private readonly logger = new Logger(ImpressaoProcessor.name);

  constructor(
    private readonly impressora: ImpressoraService,
    private readonly ponte: PonteService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly gateway: WebsocketGateway,
    private readonly status: FilaImpressaoStatusService,
  ) {
    super();
  }

  async process(job: Job<DadosJob, any, string>): Promise<any> {
    this.logger.log(`Processando impressão do pedido, JOB: ${job.id}`);

    // Pedido excluído enquanto o cupom esperava na fila (ex.: lançado errado no painel).
    if (job.data.pedidoId) {
      const existe = await this.prismaWrite.pedido.findUnique({
        where: { id: job.data.pedidoId },
        select: { id: true },
      });
      if (!existe) {
        this.logger.log(`Job ${job.id}: pedido excluído, cupom descartado.`);
        return;
      }
    }

    try {
      if (this.impressora.usaPonte() && !this.ponte.pronta) {
        this.logger.warn(`Job ${job.id}: aguardando a ponte ESP32 reconectar...`);
        if (!(await this.ponte.aguardarPronta(ESPERA_PONTE_MS))) {
          throw new ImpressoraForaError('A ponte ESP32 está desconectada', 'ponte');
        }
      }
      await this.impressora.print(job.data.texto, job.id);
      this.status.definirPausa(null);
      this.logger.log(`Pedido de Job ${job.id} impresso com sucesso!`);
    } catch (error) {
      // Ponte/impressora sem energia: pausa a fila sem gastar tentativa. O cupom volta para o
      // começo da fila e espera o tempo que for preciso; os seguintes continuam na ordem.
      if (error instanceof ImpressoraForaError && this.impressora.usaPonte()) {
        this.logger.warn(`Job ${job.id}: ${error.message}. Fila pausada até o equipamento voltar.`);
        await this.status.pausar(
          error.motivo,
          error.motivo === 'ponte' ? PAUSA_PONTE_MS : PAUSA_IMPRESSORA_MS,
        );
        throw Worker.RateLimitError();
      }
      this.logger.error(`Falha ao imprimir o pedido de JOB ${job.id}`);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  async aoConcluir(job: Job<DadosJob>) {
    if (job.data.pedidoId) await this.registrarResultado(job.data.pedidoId, true);
    this.status.avisar();
  }

  @OnWorkerEvent('failed')
  async aoFalhar(job: Job<DadosJob> | undefined, erro: Error) {
    // `failed` também sai a cada tentativa; só a última marca o pedido como não impresso.
    if (job?.data.pedidoId && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      this.logger.error(
        `Job ${job.id}: cupom não impresso após ${job.attemptsMade} tentativas (${erro.message}).`,
      );
      await this.registrarResultado(job.data.pedidoId, false);
    }
    this.status.avisar();
  }

  private async registrarResultado(pedidoId: string, impresso: boolean) {
    try {
      const [, , pedido] = await this.prismaWrite.$transaction([
        this.prismaWrite.pedido.updateMany({
          where: { id: pedidoId, impressaoPendente: { gt: 0 } },
          data: { impressaoPendente: { decrement: 1 } },
        }),
        this.prismaWrite.pedido.updateMany({
          where: { id: pedidoId },
          data: impresso ? { impressoEm: new Date() } : { impressaoFalhou: true },
        }),
        this.prismaWrite.pedido.findUnique({
          where: { id: pedidoId },
          select: { id: true, impressaoPendente: true, impressaoFalhou: true, impressoEm: true },
        }),
      ]);
      if (pedido) this.gateway.emitirParaOperadores(EVENTO_PEDIDO_IMPRESSAO, pedido);
    } catch (erro) {
      this.logger.error(`Não foi possível registrar a impressão do pedido ${pedidoId}`, erro);
    }
  }
}
