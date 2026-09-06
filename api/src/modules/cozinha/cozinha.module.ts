import { Module } from '@nestjs/common';

import { CozinhaController } from './cozinha.controller.js';
import { CozinhaService } from './cozinha.service.js';

@Module({
  controllers: [CozinhaController],
  providers: [CozinhaService],
  exports: [CozinhaService],
})
export class CozinhaModule {}
