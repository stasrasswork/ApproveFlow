import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { assertCanAccessTask } from './task-access.js';

jest.mock('./project-access.js', () => ({
  assertProjectAccess: jest.fn(),
}));

import { assertProjectAccess } from './project-access.js';

const mockedAssertProjectAccess = assertProjectAccess as jest.MockedFunction<
  typeof assertProjectAccess
>;

function createMockPrisma(task: {
  assigneeId: string | null;
  project: { id: string; workspaceId: string };
} | null) {
  return {
    task: {
      findUnique: jest.fn().mockResolvedValue(task),
    },
  } as unknown as PrismaService;
}

describe('assertCanAccessTask', () => {
  beforeEach(() => {
    mockedAssertProjectAccess.mockReset();
  });

  it('throws when task is missing', async () => {
    const prisma = createMockPrisma(null);

    await expect(
      assertCanAccessTask(prisma, 'missing', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns context for manager', async () => {
    const prisma = createMockPrisma({
      assigneeId: 'other-user',
      project: { id: 'proj-1', workspaceId: 'ws-1' },
    });
    mockedAssertProjectAccess.mockResolvedValue(WorkspaceRole.MANAGER);

    await expect(
      assertCanAccessTask(prisma, 'task-1', 'user-1'),
    ).resolves.toEqual({
      workspaceId: 'ws-1',
      projectId: 'proj-1',
    });
  });

  it('blocks member from unassigned task', async () => {
    const prisma = createMockPrisma({
      assigneeId: 'other-user',
      project: { id: 'proj-1', workspaceId: 'ws-1' },
    });
    mockedAssertProjectAccess.mockResolvedValue(WorkspaceRole.MEMBER);

    await expect(
      assertCanAccessTask(prisma, 'task-1', 'user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows member on assigned task', async () => {
    const prisma = createMockPrisma({
      assigneeId: 'user-1',
      project: { id: 'proj-1', workspaceId: 'ws-1' },
    });
    mockedAssertProjectAccess.mockResolvedValue(WorkspaceRole.MEMBER);

    await expect(
      assertCanAccessTask(prisma, 'task-1', 'user-1'),
    ).resolves.toEqual({
      workspaceId: 'ws-1',
      projectId: 'proj-1',
    });
  });
});
