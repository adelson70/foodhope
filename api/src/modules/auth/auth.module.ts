import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

import { InfraJwtModule } from '../../infra/auth/jwt.module.js';

@Module({
  imports: [InfraJwtModule],

  controllers: [AuthController],

  providers: [AuthService],

  exports: [AuthService],
})
export class AuthModule {}
