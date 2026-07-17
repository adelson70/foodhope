import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthGuard } from './auth.guard.js';
import { JwtServiceCustom } from './jwt.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { JwtGuard } from './jwt.guard.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import { RateLimitService } from './rate-limit.service.js';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: '30d',
      },
    }),
  ],

  providers: [
    JwtServiceCustom,
    JwtStrategy,
    JwtGuard,
    AuthGuard,
    RateLimitService,
    RateLimitGuard,
  ],

  exports: [
    JwtServiceCustom,
    JwtGuard,
    AuthGuard,
    RateLimitService,
    RateLimitGuard,
    JwtModule,
  ],
})
export class InfraJwtModule {}
