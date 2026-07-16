import { Global, Module } from '@nestjs/common';
import { ImpressoraService } from './impressora.service.js';

@Global()
@Module({
  providers: [ImpressoraService],
  exports: [ImpressoraService],
})
export class ImpressoraModule {}
