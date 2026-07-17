import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { DashController } from './dash.controller.js';
import { DashService } from './dash.service.js';
import { InfraJwtModule } from '../../infra/auth/jwt.module.js';

@Module({
  imports: [
    InfraJwtModule,
    BullModule.registerQueue({
      name: 'fila-impressao',
    }),
  ],
  controllers: [DashController],
  providers: [DashService],
  exports: [DashService],
})
export class DashModule {}
