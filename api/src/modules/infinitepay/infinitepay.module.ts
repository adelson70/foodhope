import { Module } from '@nestjs/common';

import { PedidoModule } from '../pedido/pedido.module.js';
import { InfinitePayClient } from './infinitepay.client.js';
import { InfinitePayController } from './infinitepay.controller.js';
import { InfinitePayService } from './infinitepay.service.js';

@Module({
  imports: [PedidoModule],
  controllers: [InfinitePayController],
  providers: [InfinitePayClient, InfinitePayService],
})
export class InfinitePayModule {}
