import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ImpressoraService } from './impressora.service.js';

@Processor('fila-impressao', { concurrency: 1 })
export class ImpressaoProcessor extends WorkerHost {
  private readonly logger = new Logger(ImpressaoProcessor.name);

  constructor(private readonly impressora: ImpressoraService) {
    super();
  }

  async process(job: Job<{ texto: string }, any, string>): Promise<any> {
    this.logger.log(`Processando impressão do pedido, JOB: ${job.id}`);
    
    try {
      await this.impressora.print(job.data.texto);
      this.logger.log(`Pedido de Job ${job.id} impresso com sucesso!`);
    } catch (error) {
      this.logger.error(`Falha ao imprimir o pedido de JOB ${job.id}`);
      throw error; 
    }
  }
}