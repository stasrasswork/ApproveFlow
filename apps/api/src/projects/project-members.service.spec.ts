import type { NotificationsService } from '../notifications/notifications.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ProjectMembersService } from './project-members.service.js';

jest.mock('../common/index.js', () => ({
  assertAgencyProjectAccess: jest.fn().mockResolvedValue({ workspaceId: 'ws-1' }),
  rethrowUniqueAsConflict: jest.fn((error: unknown) => {
    throw error;
  }),
  userBriefSelect: { id: true, email: true, name: true },
}));

describe('ProjectMembersService notifications', () => {
  let service: ProjectMembersService;
  let prisma: {
    workspaceMember: { findUnique: jest.Mock };
    projectMember: { create: jest.Mock; findUnique: jest.Mock; delete: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let notifications: { notifyWorkspaceMembers: jest.Mock };

  beforeEach(() => {
    prisma = {
      workspaceMember: { findUnique: jest.fn().mockResolvedValue({ id: 'wm-1' }) },
      projectMember: {
        create: jest.fn().mockResolvedValue({
          id: 'pm-1',
          user: { email: 'member@test.local', name: 'Member' },
        }),
        findUnique: jest.fn().mockResolvedValue({ id: 'pm-1' }),
        delete: jest.fn().mockResolvedValue(undefined),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          email: 'manager@test.local',
          name: 'Manager',
        }),
      },
    };
    notifications = {
      notifyWorkspaceMembers: jest.fn().mockResolvedValue(undefined),
    };
    service = new ProjectMembersService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  it('notifies workspace when project member is added', async () => {
    await service.add('project-1', 'actor-1', { userId: 'member-1' });

    expect(notifications.notifyWorkspaceMembers).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        workspaceId: 'ws-1',
        projectId: 'project-1',
        title: 'Project member added',
      }),
    );
  });

  it('notifies workspace when project member is removed', async () => {
    await service.remove('project-1', 'actor-1', 'member-1');

    expect(notifications.notifyWorkspaceMembers).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        workspaceId: 'ws-1',
        projectId: 'project-1',
        title: 'Project member removed',
      }),
    );
  });
});
