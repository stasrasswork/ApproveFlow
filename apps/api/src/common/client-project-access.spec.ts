import type { PrismaService } from '../../src/prisma/prisma.service.js';
import {
  ensureWorkspaceClientsInProject,
  listClientsOutsideProject,
  listProjectClientUserIds,
  listProjectMemberUserIds,
} from '../../src/common/client-project-access.js';
import { WorkspaceRole } from '../../src/generated/prisma/client.js';

function createMockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    workspaceMember: {
      findMany: jest.fn(),
    },
    projectMember: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe('client-project-access', () => {
  it('lists workspace clients not in project', async () => {
    const prisma = createMockPrisma();
    (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
      {
        userId: 'client-1',
        user: { id: 'client-1', email: 'c@test.local', name: 'Client' },
      },
      {
        userId: 'member-1',
        user: { id: 'member-1', email: 'm@test.local', name: 'Member' },
      },
    ]);
    (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([
      { userId: 'member-1' },
    ]);

    const result = await listClientsOutsideProject(prisma, 'proj-1', 'ws-1');

    expect(prisma.workspaceMember.findMany).toHaveBeenCalledWith({
      where: { workspaceId: 'ws-1', role: WorkspaceRole.CLIENT_VIEW },
      include: { user: { select: expect.any(Object) } },
    });
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe('client-1');
  });

  it('adds missing clients to project', async () => {
    const prisma = createMockPrisma();
    (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
      {
        userId: 'client-1',
        user: { id: 'client-1', email: 'c@test.local', name: 'Client' },
      },
    ]);
    (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.projectMember.createMany as jest.Mock).mockResolvedValue({ count: 1 });

    const added = await ensureWorkspaceClientsInProject(
      prisma,
      'proj-1',
      'ws-1',
    );

    expect(added).toEqual(['client-1']);
    expect(prisma.projectMember.createMany).toHaveBeenCalled();
  });

  it('lists client viewers already on the project', async () => {
    const prisma = createMockPrisma();
    (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
      { userId: 'client-1' },
      { userId: 'client-2' },
    ]);
    (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([
      { userId: 'client-1' },
    ]);

    const result = await listProjectClientUserIds(prisma, 'proj-1', 'ws-1');

    expect(result).toEqual(['client-1']);
    expect(prisma.projectMember.findMany).toHaveBeenCalledWith({
      where: { projectId: 'proj-1', userId: { in: ['client-1', 'client-2'] } },
      select: { userId: true },
    });
  });

  it('lists all project members optionally excluding actor', async () => {
    const prisma = createMockPrisma();
    (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([
      { userId: 'user-1' },
      { userId: 'user-2' },
    ]);

    const result = await listProjectMemberUserIds(prisma, 'proj-1', 'user-1');

    expect(result).toEqual(['user-2']);
  });
});
