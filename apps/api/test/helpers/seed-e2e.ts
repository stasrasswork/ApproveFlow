import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { seedDatabase } from '../../prisma/seed-fixture.js';

export async function seedE2eFixture(prisma: PrismaService): Promise<void> {
  await seedDatabase(prisma);
}

export { SEED_IDS, SEED_PASSWORD } from '../../prisma/seed-fixture.js';
