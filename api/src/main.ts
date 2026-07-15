import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger } from '@nestjs/common';
import { setupSwagger } from './config/swagger.js';

async function bootstrap() {
  const port = process.env.PORT
  const app = await NestFactory.create(AppModule);

  setupSwagger(app)

  await app.listen(port ?? 5000);
  Logger.log(`API ON em http://localhost:${port}`)
}
bootstrap();
