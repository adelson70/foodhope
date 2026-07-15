import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { JwtServiceCustom } from './jwt.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { JwtGuard } from './jwt.guard.js';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: '30d',
      },
    }),
  ],

  providers: [JwtServiceCustom, JwtStrategy, JwtGuard],

  exports: [JwtServiceCustom, JwtGuard],
})
export class InfraJwtModule {}
