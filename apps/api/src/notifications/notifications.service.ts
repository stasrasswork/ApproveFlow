import { Injectable } from '@nestjs/common';
import {
  Notification,
  NotificationType,
} from '../generated/prisma/client.js';
import { EmailOutboxService } from '../mail/email-outbox.service.js';
import { listProjectMemberUserIds } from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';

type NotifyDb = Pick<PrismaService, 'notification' | 'user' | 'projectMember'>;

export type NotificationView = Notification;

const READ_NOTIFICATION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailOutbox: EmailOutboxService,
  ) {}

  async list(userId: string, limit = 50): Promise<NotificationView[]> {
    const readCutoff = new Date(Date.now() - READ_NOTIFICATION_MAX_AGE_MS);

    return this.prisma.notification.findMany({
      where: {
        userId,
        OR: [{ read: false }, { read: true, createdAt: { gte: readCutoff } }],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async notifyProjectMembers(
    db: NotifyDb,
    params: {
      workspaceId: string;
      projectId: string;
      taskId: string;
      actorUserId: string;
      title: string;
      body: string;
      type?: NotificationType;
    },
  ): Promise<void> {
    const recipientIds = await listProjectMemberUserIds(
      db,
      params.projectId,
      params.actorUserId,
    );

    if (recipientIds.length === 0) {
      return;
    }

    await db.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        workspaceId: params.workspaceId,
        type: params.type ?? NotificationType.TASK_UPDATE,
        title: params.title,
        body: params.body,
        taskId: params.taskId,
        projectId: params.projectId,
      })),
    });
  }

  async notifyWorkspaceInvite(
    db: Pick<PrismaService, 'notification'>,
    params: {
      userId: string;
      workspaceId: string;
      workspaceName: string;
    },
  ): Promise<void> {
    await db.notification.create({
      data: {
        userId: params.userId,
        workspaceId: params.workspaceId,
        type: NotificationType.WORKSPACE_INVITE,
        title: 'Workspace invitation',
        body: `You were added to "${params.workspaceName}".`,
      },
    });
  }

  async sendTaskClientHandoffEmails(params: {
    clientUserIds: string[];
    workspaceId: string;
    taskId: string;
    projectId: string;
    taskTitle: string;
    projectName: string;
  }): Promise<void> {
    if (params.clientUserIds.length === 0) {
      return;
    }

    await this.emailOutbox.enqueueHandoffEmails(params, params.taskId);
  }
}
