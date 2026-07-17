import { Module } from '@nestjs/common';

import { DashController } from './dash.controller.js';
import { DashService } from './dash.service.js';
import { InfraJwtModule } from '../../infra/auth/jwt.module.js';

@Module({
  imports: [InfraJwtModule],
  controllers: [DashController],
  providers: [DashService],
  exports: [DashService],
})
export class DashModule {}
