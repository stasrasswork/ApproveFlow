import 'dotenv/config';
import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

function configureCors(app: Awaited<ReturnType<typeof NestFactory.create>>): void {
  const corsOrigin = process.env.CORS_ORIGIN;

  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((origin) => origin.trim())
      : true,
    credentials: true,
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureCors(app);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ApproveFlow API')
    .setDescription(
      'REST API for workspaces, projects, tasks, comments, and approval workflow.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
