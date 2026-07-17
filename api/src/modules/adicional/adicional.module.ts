import { Module } from '@nestjs/common';
import { AdicionalController } from './adicional.controller.js';
import { AdicionalService } from './adicional.service.js';

@Module({
  controllers: [AdicionalController],
  providers: [AdicionalService],
  exports: [AdicionalService],
})
export class AdicionalModule {}
