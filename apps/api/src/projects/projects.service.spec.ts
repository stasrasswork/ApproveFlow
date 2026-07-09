import type { NotificationsService } from '../notifications/notifications.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from './projects.service.js';

jest.mock('../common/index.js', () => ({
  assertAgencyProjectAccess: jest.fn(),
  assertAgencyRole: jest.fn(),
  assertWorkspaceExists: jest.fn(),
  getWorkspaceRole: jest.fn(),
  isAgencyRole: jest.fn().mockReturnValue(true),
  listClientsOutsideProject: jest.fn(),
  loadProjectAndAssertAccess: jest.fn(),
}));

import { assertAgencyProjectAccess } from '../common/index.js';

describe('ProjectsService notifications', () => {
  let service: ProjectsService;
  let prisma: {
    project: {
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
  };
  let notifications: {
    notifyWorkspaceMembers: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      project: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
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
    (assertAgencyProjectAccess as jest.Mock).mockResolvedValue({
      workspaceId: 'ws-1',
    });
    service = new ProjectsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
      { getStats: jest.fn() } as never,
      { getActivity: jest.fn() } as never,
    );
  });

  it('sends workspace-wide notification for project status change', async () => {
    prisma.project.findUniqueOrThrow.mockResolvedValue({
      id: 'project-1',
      name: 'Website',
      status: 'ACTIVE',
    });
    prisma.project.update.mockResolvedValue({
      id: 'project-1',
      name: 'Website',
      status: 'COMPLETED',
    });

    await service.update('project-1', 'user-1', { status: 'COMPLETED' as never });

    expect(notifications.notifyWorkspaceMembers).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        workspaceId: 'ws-1',
        projectId: 'project-1',
        title: 'Project status updated',
        body: expect.stringContaining('status from active to completed'),
      }),
    );
  });

  it('sends workspace-wide notification for generic project updates', async () => {
    prisma.project.findUniqueOrThrow.mockResolvedValue({
      id: 'project-1',
      name: 'Old website',
      status: 'ACTIVE',
    });
    prisma.project.update.mockResolvedValue({
      id: 'project-1',
      name: 'New website',
      status: 'ACTIVE',
    });

    await service.update('project-1', 'user-1', { name: 'New website' });

    expect(notifications.notifyWorkspaceMembers).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        workspaceId: 'ws-1',
        projectId: 'project-1',
        title: 'Project updated',
      }),
    );
  });
});
