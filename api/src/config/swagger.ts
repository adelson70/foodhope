import { INestApplication } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import basicAuth from 'express-basic-auth';

export function setupSwagger(app: INestApplication) {
    app.use(
        ['/docs', '/docs-json'],
        basicAuth({
          challenge: true,
          users: {
            [process.env.SWAGGER_USER!]: process.env.SWAGGER_PASSWORD!,
          },
        }),
      );
    
      const config = new DocumentBuilder()
        .setTitle('Food Hope API')
        .setDescription('Documentação da API')
        .setVersion('1.0')
        .addBearerAuth()
        .build()
    
      const document = SwaggerModule.createDocument(app, config)
    
      SwaggerModule.setup('docs', app, document)
}