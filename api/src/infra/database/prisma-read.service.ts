import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaReadService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaReadService.name);

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    });
    super({
      adapter,
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.feedbackDatabase('OK');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.feedbackDatabase('ERROR');
  }

  private feedbackDatabase(status: 'OK' | 'ERROR') {
    if (status === 'OK') this.logger.log(`Banco de Dados Leitura: ${status}`);
    else if (status === 'ERROR') this.logger.log(`Banco de Dados Leitura: ${status}`);
  }
}
