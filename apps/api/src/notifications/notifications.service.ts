import { Injectable } from '@nestjs/common';
import {
  Notification,
  NotificationType,
} from '../generated/prisma/client.js';
import { listProjectMemberUserIds } from '../common/index.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

type NotifyDb = Pick<PrismaService, 'notification' | 'user' | 'projectMember'>;

export type NotificationView = Notification;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async list(userId: string, limit = 50): Promise<NotificationView[]> {
    return this.prisma.notification.findMany({
      where: { userId },
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

  async sendTaskClientHandoffEmails(
    db: Pick<PrismaService, 'user'>,
    params: {
      clientUserIds: string[];
      workspaceId: string;
      taskId: string;
      projectId: string;
      taskTitle: string;
      projectName: string;
    },
  ): Promise<void> {
    if (params.clientUserIds.length === 0) {
      return;
    }

    const title = 'Task awaiting your review';
    const body = `"${params.taskTitle}" in ${params.projectName} was sent to you for approval.`;
    const link = `/w/${params.workspaceId}/projects/${params.projectId}/tasks/${params.taskId}`;

    const users = await db.user.findMany({
      where: { id: { in: params.clientUserIds } },
      select: { email: true },
    });

    for (const user of users) {
      const url = this.mail.appUrl(link);
      await this.mail.send({
        to: user.email,
        subject: title,
        text: `${body}\n\nOpen: ${url}`,
      });
    }
  }
}
