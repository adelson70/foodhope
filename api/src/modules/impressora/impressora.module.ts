import { Global, Module } from '@nestjs/common';

import { ImpressaoProcessor } from './impressao.processor.js';
import { ImpressoraController } from './impressora.controller.js';
import { ImpressoraService } from './impressora.service.js';

@Global()
@Module({
  controllers: [ImpressoraController],
  providers: [ImpressoraService, ImpressaoProcessor],
  exports: [ImpressoraService],
})
export class ImpressoraModule {}
