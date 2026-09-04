import { Module } from '@nestjs/common';

import { TelaPedidosController } from './tela-pedidos.controller.js';
import { TelaPedidosService } from './tela-pedidos.service.js';

@Module({
  controllers: [TelaPedidosController],
  providers: [TelaPedidosService],
  exports: [TelaPedidosService],
})
export class TelaPedidosModule {}
