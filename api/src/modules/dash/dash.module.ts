import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { DashController } from './dash.controller.js';
import { DashService } from './dash.service.js';
import { InfraJwtModule } from '../../infra/auth/jwt.module.js';
import { FILA_IMPRESSAO } from '../impressora/fila-impressao.js';

@Module({
  imports: [InfraJwtModule, BullModule.registerQueue(FILA_IMPRESSAO)],
  controllers: [DashController],
  providers: [DashService],
  exports: [DashService],
})
export class DashModule {}
