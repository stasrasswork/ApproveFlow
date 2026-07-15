import 'dotenv/config';
import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { ENV } from './config/env.js';

function configureCors(app: Awaited<ReturnType<typeof NestFactory.create>>): void {
  const corsOrigin = ENV.CORS_ORIGIN;

  if (!corsOrigin && ENV.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGIN must be set when NODE_ENV=production');
  }

  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((origin) => origin.trim())
      : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Correct client IPs (and throttling) behind nginx / load balancers.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(helmet());
  app.use(cookieParser());
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
  if (ENV.NODE_ENV !== 'production') {
    SwaggerModule.setup('docs', app, swaggerDocument);
  }

  await app.listen(ENV.PORT);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
