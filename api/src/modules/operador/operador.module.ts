import { Module } from '@nestjs/common';
import { OperadorController } from './operador.controller.js';
import { OperadorService } from './operador.service.js';

@Module({
  controllers: [OperadorController],
  providers: [OperadorService],
  exports: [OperadorService],
})
export class OperadorModule {}
