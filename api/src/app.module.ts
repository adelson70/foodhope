import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infra/database/database.module.js';
import { InfraJwtModule } from './infra/auth/jwt.module.js';
import { RedisModule } from './infra/cache/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ProdutoModule } from './modules/produto/produto.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    RedisModule,
    AuthModule,
    ProdutoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
