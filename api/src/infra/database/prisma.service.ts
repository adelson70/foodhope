import { Injectable } from '@nestjs/common';
import { PrismaReadService } from './prisma-read.service.js';
import { PrismaWriteService } from './prisma-write.service.js';

@Injectable()
export class PrismaService {
  constructor(
    public readonly read: PrismaReadService,
    public readonly write: PrismaWriteService,
  ) {}
}
