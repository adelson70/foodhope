import { Module } from '@nestjs/common';

import { PedidoController } from './pedido.controller.js';
import { PedidoService } from './pedido.service.js';

import { InfraJwtModule } from '../../infra/auth/jwt.module.js';

@Module({
  imports: [InfraJwtModule],

  controllers: [PedidoController],

  providers: [PedidoService],

  exports: [PedidoService],
})
export class PedidoModule {}
