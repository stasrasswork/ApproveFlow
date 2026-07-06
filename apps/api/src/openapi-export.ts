import 'dotenv/config';
import 'reflect-metadata';

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { PrismaService } from './prisma/prisma.service.js';

const repoRoot = join(process.cwd(), '..', '..');
const outputPath = join(repoRoot, 'packages/shared/openapi.json');

async function exportOpenApi(): Promise<void> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue({
      onModuleInit: async () => undefined,
      onModuleDestroy: async () => undefined,
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ApproveFlow API')
    .setDescription(
      'REST API for workspaces, projects, tasks, comments, and approval workflow.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();

  console.log(`Wrote ${outputPath}`);
}

exportOpenApi().catch((error) => {
  console.error(error);
  process.exit(1);
});
