import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProjectStatus } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { assertProjectAllowsTaskChanges } from './project-status.js';

function createMockPrisma(status: ProjectStatus | null) {
  return {
    project: {
      findUnique: jest.fn().mockResolvedValue(
        status === null ? null : { status },
      ),
    },
  } as unknown as PrismaService;
}

describe('assertProjectAllowsTaskChanges', () => {
  it('throws when project is missing', async () => {
    const prisma = createMockPrisma(null);

    await expect(
      assertProjectAllowsTaskChanges(prisma, 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when project is completed', async () => {
    const prisma = createMockPrisma(ProjectStatus.COMPLETED);

    await expect(
      assertProjectAllowsTaskChanges(prisma, 'proj-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when project is paused', async () => {
    const prisma = createMockPrisma(ProjectStatus.PAUSED);

    await expect(
      assertProjectAllowsTaskChanges(prisma, 'proj-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows active projects', async () => {
    const prisma = createMockPrisma(ProjectStatus.ACTIVE);

    await expect(
      assertProjectAllowsTaskChanges(prisma, 'proj-1'),
    ).resolves.toBeUndefined();
  });
});
