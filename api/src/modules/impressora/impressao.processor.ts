import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ImpressoraService } from './impressora.service.js';
import { PonteService } from './ponte.service.js';

/** Queda curta da ponte (Wi-Fi/ESP32 reiniciando): segura o job em vez de gastar tentativa. */
const ESPERA_PONTE_MS = 30_000;

@Processor('fila-impressao', { concurrency: 1 })
export class ImpressaoProcessor extends WorkerHost {
  private readonly logger = new Logger(ImpressaoProcessor.name);

  constructor(
    private readonly impressora: ImpressoraService,
    private readonly ponte: PonteService,
  ) {
    super();
  }

  async process(job: Job<{ texto: string }, any, string>): Promise<any> {
    this.logger.log(`Processando impressão do pedido, JOB: ${job.id}`);

    try {
      if (this.impressora.usaPonte() && !this.ponte.pronta) {
        this.logger.warn(`Job ${job.id}: aguardando a ponte ESP32 reconectar...`);
        await this.ponte.aguardarPronta(ESPERA_PONTE_MS);
      }
      await this.impressora.print(job.data.texto, job.id);
      this.logger.log(`Pedido de Job ${job.id} impresso com sucesso!`);
    } catch (error) {
      this.logger.error(`Falha ao imprimir o pedido de JOB ${job.id}`);
      throw error;
    }
  }
}
