import { NotFoundException } from '@nestjs/common';
import { ProjectStatus } from '../generated/prisma/client.js';
import { assertProjectExists } from './project-status.js';

describe('assertProjectExists', () => {
  const prisma = {
    project: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    prisma.project.findUnique.mockReset();
  });

  it('throws when project is missing', async () => {
    prisma.project.findUnique.mockResolvedValue(null);

    await expect(assertProjectExists(prisma as never, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('allows ACTIVE projects', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });

    await expect(assertProjectExists(prisma as never, 'proj-1')).resolves.toBeUndefined();
  });

  it('allows PAUSED projects (status is informational)', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });

    await expect(assertProjectExists(prisma as never, 'proj-1')).resolves.toBeUndefined();
  });

  it('allows COMPLETED projects (status is informational)', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });

    await expect(assertProjectExists(prisma as never, 'proj-1')).resolves.toBeUndefined();
    expect(ProjectStatus.COMPLETED).toBeDefined();
  });
});
