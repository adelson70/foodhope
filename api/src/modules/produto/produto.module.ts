import { Module } from '@nestjs/common';

import { ProdutoController } from './produto.controller.js';
import { ProdutoService } from './produto.service.js';

import { InfraJwtModule } from '../../infra/auth/jwt.module.js';

@Module({
  imports: [InfraJwtModule],

  controllers: [ProdutoController],

  providers: [ProdutoService],

  exports: [ProdutoService],
})
export class ProdutoModule {}
