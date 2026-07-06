import { NotificationType } from '../generated/prisma/client.js';
import type { MailService } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';

jest.mock('../common/index.js', () => ({
  listProjectMemberUserIds: jest.fn(),
}));

import { listProjectMemberUserIds } from '../common/index.js';

const mockedListProjectMemberUserIds =
  listProjectMemberUserIds as jest.MockedFunction<
    typeof listProjectMemberUserIds
  >;

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notification: {
      findMany: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
      createMany: jest.Mock;
      create: jest.Mock;
    };
    user: {
      findMany: jest.Mock;
    };
  };
  let mail: {
    appUrl: jest.Mock;
    send: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
        createMany: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };
    mail = {
      appUrl: jest.fn((path: string) => `http://app.test${path}`),
      send: jest.fn().mockResolvedValue(true),
    };
    service = new NotificationsService(
      prisma as unknown as PrismaService,
      mail as unknown as MailService,
    );
    mockedListProjectMemberUserIds.mockReset();
  });

  it('lists notifications for user', async () => {
    prisma.notification.findMany.mockResolvedValue([{ id: 'n-1' }]);

    const result = await service.list('user-1', 10);

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    expect(result).toEqual([{ id: 'n-1' }]);
  });

  it('notifies project members except actor', async () => {
    mockedListProjectMemberUserIds.mockResolvedValue(['user-2', 'user-3']);

    await service.notifyProjectMembers(prisma as unknown as PrismaService, {
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      taskId: 'task-1',
      actorUserId: 'user-1',
      title: 'Updated',
      body: 'Task changed',
      type: NotificationType.TASK_UPDATE,
    });

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'user-2',
          workspaceId: 'ws-1',
          taskId: 'task-1',
        }),
        expect.objectContaining({ userId: 'user-3' }),
      ],
    });
  });

  it('skips member notifications when no recipients', async () => {
    mockedListProjectMemberUserIds.mockResolvedValue([]);

    await service.notifyProjectMembers(prisma as unknown as PrismaService, {
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      taskId: 'task-1',
      actorUserId: 'user-1',
      title: 'Updated',
      body: 'Task changed',
    });

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('creates workspace invite notification', async () => {
    await service.notifyWorkspaceInvite(prisma as unknown as PrismaService, {
      userId: 'user-1',
      workspaceId: 'ws-1',
      workspaceName: 'Demo',
    });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        type: NotificationType.WORKSPACE_INVITE,
        body: 'You were added to "Demo".',
      }),
    });
  });

  it('sends client handoff emails', async () => {
    prisma.user.findMany.mockResolvedValue([
      { email: 'client@test.local' },
    ]);

    await service.sendTaskClientHandoffEmails(
      prisma as unknown as PrismaService,
      {
        clientUserIds: ['client-1'],
        workspaceId: 'ws-1',
        taskId: 'task-1',
        projectId: 'proj-1',
        taskTitle: 'Banner',
        projectName: 'Demo',
      },
    );

    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'client@test.local',
        subject: 'Task awaiting your review',
      }),
    );
  });
});
