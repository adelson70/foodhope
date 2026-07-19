import { ImpressoraModule } from './modules/impressora/impressora.module.js';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infra/database/database.module.js';
import { RedisModule } from './infra/cache/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ProdutoModule } from './modules/produto/produto.module.js';
import { AdicionalModule } from './modules/adicional/adicional.module.js';
import { CategoriaModule } from './modules/categoria/categoria.module.js';
import { PedidoModule } from './modules/pedido/pedido.module.js';
import { DashModule } from './modules/dash/dash.module.js';
import { VisitorModule } from './modules/visitor/visitor.module.js';
import { BullModule } from '@nestjs/bullmq';
import { WebsocketModule } from './infra/websocket/websocket.module.js';
import { AuthGuard } from './infra/auth/auth.guard.js';
import { RolesGuard } from './infra/auth/roles.guard.js';
import { RateLimitGuard } from './infra/auth/rate-limit.guard.js';
import { InfraJwtModule } from './infra/auth/jwt.module.js';
import { OperadorModule } from './modules/operador/operador.module.js';

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
    WebsocketModule,
    DatabaseModule,
    RedisModule,
    InfraJwtModule,
    AuthModule,
    VisitorModule,
    ProdutoModule,
    AdicionalModule,
    CategoriaModule,
    PedidoModule,
    DashModule,
    ImpressoraModule,
    OperadorModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
