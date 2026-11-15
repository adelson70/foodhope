import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';

import { FILA_IMPRESSAO } from './fila-impressao.js';
import { FilaImpressaoStatusService } from './fila-impressao-status.service.js';
import { ImpressaoProcessor } from './impressao.processor.js';
import { ImpressoraController } from './impressora.controller.js';
import { ImpressoraService } from './impressora.service.js';
import { PonteService } from './ponte.service.js';

@Global()
@Module({
  imports: [BullModule.registerQueue(FILA_IMPRESSAO)],
  controllers: [ImpressoraController],
  providers: [ImpressoraService, PonteService, ImpressaoProcessor, FilaImpressaoStatusService],
  exports: [ImpressoraService, PonteService, FilaImpressaoStatusService],
})
export class ImpressoraModule {}
