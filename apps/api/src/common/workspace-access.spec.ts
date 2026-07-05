import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { WorkspaceRole } from '../../src/generated/prisma/client.js';
import { getWorkspaceRole } from './workspace-access.js';

function createMockPrisma(membership: { role: WorkspaceRole } | null) {
  return {
    workspaceMember: {
      findUnique: jest.fn().mockResolvedValue(membership),
    },
  } as unknown as PrismaService;
}

describe('workspace-access', () => {
  it('returns role for workspace member', async () => {
    const prisma = createMockPrisma({ role: WorkspaceRole.MANAGER });

    await expect(getWorkspaceRole(prisma, 'ws-1', 'user-1')).resolves.toBe(
      WorkspaceRole.MANAGER,
    );
  });

  it('throws when user is not a workspace member', async () => {
    const prisma = createMockPrisma(null);

    await expect(getWorkspaceRole(prisma, 'ws-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
