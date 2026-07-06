import { BadRequestException } from '@nestjs/common';
import { WorkspaceRole } from '../generated/prisma/client.js';
import type { MailService } from '../mail/mail.service.js';
import type { NotificationsService } from '../notifications/notifications.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { WorkspaceInvitesService } from './workspace-invites.service.js';

describe('WorkspaceInvitesService', () => {
  let service: WorkspaceInvitesService;
  let prisma: {
    workspaceInvite: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    workspaceMember: {
      upsert: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let mail: {
    appUrl: jest.Mock;
    send: jest.Mock;
  };
  let notifications: {
    notifyWorkspaceInvite: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      workspaceInvite: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      workspaceMember: {
        upsert: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
      ),
    };
    mail = {
      appUrl: jest.fn((path: string) => `http://app.test${path}`),
      send: jest.fn().mockResolvedValue(false),
    };
    notifications = {
      notifyWorkspaceInvite: jest.fn().mockResolvedValue(undefined),
    };
    service = new WorkspaceInvitesService(
      prisma as unknown as PrismaService,
      mail as unknown as MailService,
      notifications as unknown as NotificationsService,
    );
  });

  it('rejects invalid invite tokens', async () => {
    prisma.workspaceInvite.findUnique.mockResolvedValue(null);

    await expect(
      service.acceptInviteToken('bad-token', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts pending invites for email on registration', async () => {
    prisma.workspaceInvite.findMany.mockResolvedValue([
      {
        id: 'invite-1',
        workspaceId: 'ws-1',
        role: WorkspaceRole.CLIENT_VIEW,
        workspace: { id: 'ws-1', name: 'Demo' },
      },
    ]);
    prisma.workspaceMember.upsert.mockResolvedValue({
      workspaceId: 'ws-1',
      userId: 'user-1',
      role: WorkspaceRole.CLIENT_VIEW,
      user: { id: 'user-1', email: 'client@test.local', name: 'Client' },
    });
    prisma.workspaceInvite.update.mockResolvedValue({});

    const accepted = await service.acceptPendingInvitesForEmail(
      'user-1',
      'client@test.local',
    );

    expect(accepted).toBe(1);
    expect(notifications.notifyWorkspaceInvite).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        userId: 'user-1',
        workspaceName: 'Demo',
      }),
    );
  });

  it('creates email invite and returns token in non-production', async () => {
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const result = await service.createEmailInvite(
      'ws-1',
      'admin-1',
      'new@test.local',
      WorkspaceRole.MEMBER,
      'Demo',
    );

    expect(prisma.workspaceInvite.create).toHaveBeenCalled();
    expect(mail.send).toHaveBeenCalled();
    expect(result.status).toBe('pending');
    if (result.status === 'pending') {
      expect(result.inviteToken).toBeDefined();
    }

    process.env.NODE_ENV = previousEnv;
  });
});
