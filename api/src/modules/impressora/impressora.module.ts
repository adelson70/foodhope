import { Global, Module } from '@nestjs/common';
import { ImpressoraService } from './impressora.service.js';
import { ImpressaoProcessor } from './impressao.processor.js';

@Global()
@Module({
  providers: [ImpressoraService, ImpressaoProcessor],
  exports: [ImpressoraService],
})
export class ImpressoraModule {}
