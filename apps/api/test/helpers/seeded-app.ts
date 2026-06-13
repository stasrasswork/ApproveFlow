import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { createTestApp } from './create-app.js';
import { resetDb } from './reset-db.js';
import { seedE2eFixture } from './seed-e2e.js';

export type SeededAppContext = {
  app: INestApplication;
  prisma: PrismaService;
};

export function describeWithSeededApp(
  name: string,
  defineTests: (getContext: () => SeededAppContext) => void,
): void {
  describe(name, () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeAll(async () => {
      app = await createTestApp();
      prisma = app.get(PrismaService);
    });

    beforeEach(async () => {
      await resetDb(prisma);
      await seedE2eFixture(prisma);
    });

    afterAll(async () => {
      await app.close();
    });

    defineTests(() => ({ app, prisma }));
  });
}

export function describeWithApp(
  name: string,
  defineTests: (getContext: () => { app: INestApplication }) => void,
): void {
  describe(name, () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createTestApp();
    });

    afterAll(async () => {
      await app.close();
    });

    defineTests(() => ({ app }));
  });
}
