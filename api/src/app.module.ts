import { ImpressoraModule } from './modules/impressora/impressora.module.js';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infra/database/database.module.js';
import { RedisModule } from './infra/cache/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ProdutoModule } from './modules/produto/produto.module.js';
import { PedidoModule } from './modules/pedido/pedido.module.js';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || '',
      }
    }),
    BullModule.registerQueue({
      name: 'fila-impressao',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'fixed',
          delay: 15000,
        },
      },
    }),
    DatabaseModule,
    RedisModule,
    AuthModule,
    ProdutoModule,
    PedidoModule,
    ImpressoraModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
