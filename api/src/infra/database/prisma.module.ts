import { Global, Module } from '@nestjs/common';
import { PrismaReadService } from './prisma-read.service.js';
import { PrismaWriteService } from './prisma-write.service.js';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [
    PrismaReadService,
    PrismaWriteService,
    PrismaService,
  ],
  exports: [PrismaService],
})
export class PrismaModule {}