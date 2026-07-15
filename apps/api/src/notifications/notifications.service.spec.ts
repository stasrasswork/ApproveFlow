import { NotificationType } from '../generated/prisma/client.js';
import type { EmailOutboxService } from '../mail/email-outbox.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';

jest.mock('../common/index.js', () => ({
  listWorkspaceMemberUserIds: jest.fn(),
}));

import { listWorkspaceMemberUserIds } from '../common/index.js';

const mockedListWorkspaceMemberUserIds =
  listWorkspaceMemberUserIds as jest.MockedFunction<
    typeof listWorkspaceMemberUserIds
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
  let emailOutbox: {
    enqueueHandoffEmails: jest.Mock;
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
    emailOutbox = {
      enqueueHandoffEmails: jest.fn().mockResolvedValue(undefined),
    };
    service = new NotificationsService(
      prisma as unknown as PrismaService,
      emailOutbox as unknown as EmailOutboxService,
    );
    mockedListWorkspaceMemberUserIds.mockReset();
  });

  it('lists notifications for user', async () => {
    prisma.notification.findMany.mockResolvedValue([{ id: 'n-1' }]);

    const result = await service.list('user-1', 10);

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        OR: [
          { read: false },
          { read: true, createdAt: { gte: expect.any(Date) } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    expect(result).toEqual([{ id: 'n-1' }]);
  });

  it('notifies all workspace members without duplicates', async () => {
    mockedListWorkspaceMemberUserIds.mockResolvedValue([
      'user-1',
      'user-2',
      'user-2',
    ]);

    await service.notifyWorkspaceMembers(prisma as unknown as PrismaService, {
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      taskId: 'task-1',
      excludeUserId: 'user-1',
      title: 'Updated',
      body: 'Task changed',
      type: NotificationType.TASK_UPDATE,
    });

    expect(mockedListWorkspaceMemberUserIds).toHaveBeenCalledWith(prisma, 'ws-1', {
      excludeUserIds: ['user-1'],
      includeRoles: undefined,
    });
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: 'user-1', workspaceId: 'ws-1', taskId: 'task-1' }),
        expect.objectContaining({ userId: 'user-2' }),
      ],
    });
  });

  it('skips member notifications when no recipients', async () => {
    mockedListWorkspaceMemberUserIds.mockResolvedValue([]);

    await service.notifyWorkspaceMembers(prisma as unknown as PrismaService, {
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      taskId: 'task-1',
      title: 'Updated',
      body: 'Task changed',
    });

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('notifies explicit recipientUserIds without workspace lookup', async () => {
    await service.notifyWorkspaceMembers(prisma as unknown as PrismaService, {
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      taskId: 'task-1',
      excludeUserId: 'actor-1',
      recipientUserIds: ['client-1', 'actor-1', 'client-2'],
      title: 'Handoff',
      body: 'Sent',
      type: NotificationType.TASK_CLIENT_HANDOFF,
    });

    expect(mockedListWorkspaceMemberUserIds).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: 'client-1' }),
        expect.objectContaining({ userId: 'client-2' }),
      ],
    });
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

  it('enqueues client handoff emails', async () => {
    await service.sendTaskClientHandoffEmails({
      clientUserIds: ['client-1'],
      workspaceId: 'ws-1',
      taskId: 'task-1',
      projectId: 'proj-1',
      taskTitle: 'Banner',
      projectName: 'Demo',
    });

    expect(emailOutbox.enqueueHandoffEmails).toHaveBeenCalledWith(
      {
        clientUserIds: ['client-1'],
        workspaceId: 'ws-1',
        taskId: 'task-1',
        projectId: 'proj-1',
        taskTitle: 'Banner',
        projectName: 'Demo',
      },
      'task-1',
    );
  });
});
