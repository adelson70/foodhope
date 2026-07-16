import { Module } from '@nestjs/common';

import { PedidoController } from './pedido.controller.js';
import { PedidoService } from './pedido.service.js';

import { InfraJwtModule } from '../../infra/auth/jwt.module.js';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    InfraJwtModule,
    BullModule.registerQueue({
      name: 'fila-impressao',
    }),
  ],

  controllers: [PedidoController],

  providers: [PedidoService],

  exports: [PedidoService],
})
export class PedidoModule {}
