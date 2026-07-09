import type { NotificationsService } from '../notifications/notifications.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { WorkspaceMembersService } from './workspace-members.service.js';

jest.mock('../common/index.js', () => ({
  assertAdminRole: jest.fn(),
  assertAgencyRole: jest.fn().mockResolvedValue('ADMIN'),
  assertWorkspaceExists: jest.fn(),
  getWorkspaceRole: jest.fn(),
  normalizeEmail: (value: string) => value,
  rethrowUniqueAsConflict: jest.fn((error: unknown) => {
    throw error;
  }),
  userBriefSelect: { id: true, email: true, name: true },
}));

import { assertAdminRole, assertWorkspaceExists } from '../common/index.js';

describe('WorkspaceMembersService notifications', () => {
  let service: WorkspaceMembersService;
  let prisma: {
    workspaceMember: {
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
  };
  let notifications: {
    notifyWorkspaceMembers: jest.Mock;
    notifyWorkspaceInvite: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      workspaceMember: {
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(2),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          email: 'user@test.local',
          name: 'User',
        }),
      },
    };
    notifications = {
      notifyWorkspaceMembers: jest.fn().mockResolvedValue(undefined),
      notifyWorkspaceInvite: jest.fn().mockResolvedValue(undefined),
    };
    service = new WorkspaceMembersService(
      prisma as unknown as PrismaService,
      { createEmailInvite: jest.fn() } as never,
      notifications as unknown as NotificationsService,
    );
    (assertWorkspaceExists as jest.Mock).mockResolvedValue(undefined);
    (assertAdminRole as jest.Mock).mockResolvedValue(undefined);
  });

  it('notifies workspace members after role update', async () => {
    prisma.workspaceMember.findUnique.mockResolvedValue({
      id: 'wm-1',
      role: 'MEMBER',
    });
    prisma.workspaceMember.update.mockResolvedValue({
      id: 'wm-1',
      user: { email: 'member@test.local', name: 'Member' },
    });

    await service.updateRole('ws-1', 'admin-1', 'member-1', { role: 'MANAGER' as never });

    expect(notifications.notifyWorkspaceMembers).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        workspaceId: 'ws-1',
        title: 'Workspace role updated',
      }),
    );
  });

  it('notifies workspace members after member removal', async () => {
    prisma.workspaceMember.findUnique.mockResolvedValue({
      id: 'wm-2',
      role: 'MEMBER',
    });

    await service.remove('ws-1', 'admin-1', 'member-2');

    expect(notifications.notifyWorkspaceMembers).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        workspaceId: 'ws-1',
        title: 'Workspace member removed',
      }),
    );
  });
});
