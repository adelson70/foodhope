import { Module } from '@nestjs/common';

import { PedidoController } from './pedido.controller.js';
import { PedidoService } from './pedido.service.js';

import { InfraJwtModule } from '../../infra/auth/jwt.module.js';
import { BullModule } from '@nestjs/bullmq';
import { CozinhaModule } from '../cozinha/cozinha.module.js';
import { FILA_IMPRESSAO } from '../impressora/fila-impressao.js';

@Module({
  imports: [InfraJwtModule, CozinhaModule, BullModule.registerQueue(FILA_IMPRESSAO)],

  controllers: [PedidoController],

  providers: [PedidoService],

  exports: [PedidoService],
})
export class PedidoModule {}
