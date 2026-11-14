import { Global, Module } from '@nestjs/common';

import { ImpressaoProcessor } from './impressao.processor.js';
import { ImpressoraController } from './impressora.controller.js';
import { ImpressoraService } from './impressora.service.js';
import { PonteService } from './ponte.service.js';

@Global()
@Module({
  controllers: [ImpressoraController],
  providers: [ImpressoraService, PonteService, ImpressaoProcessor],
  exports: [ImpressoraService, PonteService],
})
export class ImpressoraModule {}
