import { Injectable } from '@nestjs/common';
import { formatTaskStatus as formatStatusLabel } from '@approveflow/shared';
import type { TaskStatus as SharedTaskStatus } from '@approveflow/shared';
import {
  NotificationType,
  TaskStatus,
} from '../generated/prisma/client.js';
import { userBriefSelect, type UserBrief } from '../common/index.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

type NotifyDb = Pick<
  PrismaService,
  'notification' | 'user' | 'projectMember'
>;

export type TaskNotificationContext = {
  taskId: string;
  projectId: string;
  workspaceId: string;
  taskTitle: string;
  projectName: string;
};

@Injectable()
export class TaskNotificationsService {
  constructor(private readonly notifications: NotificationsService) {}

  async notifyCreated(
    db: NotifyDb,
    actorUserId: string,
    actor: UserBrief | null,
    task: TaskNotificationContext,
  ): Promise<void> {
    await this.notifications.notifyProjectMembers(db, {
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      taskId: task.taskId,
      actorUserId,
      type: NotificationType.TASK_UPDATE,
      title: 'New task created',
      body: `${this.displayUserName(actor)} created "${task.taskTitle}" in ${task.projectName}.`,
    });
  }

  async notifyUpdated(
    db: NotifyDb,
    actorUserId: string,
    actor: UserBrief | null,
    task: TaskNotificationContext,
  ): Promise<void> {
    await this.notifications.notifyProjectMembers(db, {
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      taskId: task.taskId,
      actorUserId,
      type: NotificationType.TASK_UPDATE,
      title: 'Task updated',
      body: `${this.displayUserName(actor)} updated "${task.taskTitle}" in ${task.projectName}.`,
    });
  }

  async notifyStatusChanged(
    db: NotifyDb,
    actorUserId: string,
    actor: UserBrief | null,
    task: TaskNotificationContext,
    fromStatus: TaskStatus,
    toStatus: TaskStatus,
  ): Promise<void> {
    const type =
      toStatus === TaskStatus.CLIENT_HANDOFF
        ? NotificationType.TASK_CLIENT_HANDOFF
        : NotificationType.TASK_UPDATE;

    const title =
      toStatus === TaskStatus.CLIENT_HANDOFF
        ? 'Task sent for client review'
        : 'Task status updated';

    await this.notifications.notifyProjectMembers(db, {
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      taskId: task.taskId,
      actorUserId,
      type,
      title,
      body: `${this.displayUserName(actor)} moved "${task.taskTitle}" in ${task.projectName} from ${this.formatStatus(fromStatus)} to ${this.formatStatus(toStatus)}.`,
    });
  }

  async notifyDueChanged(
    db: NotifyDb,
    actorUserId: string,
    actor: UserBrief | null,
    task: TaskNotificationContext,
    newDueAt: Date | null,
  ): Promise<void> {
    const dueLabel = newDueAt
      ? newDueAt.toISOString().slice(0, 10)
      : 'no due date';

    await this.notifications.notifyProjectMembers(db, {
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      taskId: task.taskId,
      actorUserId,
      type: NotificationType.TASK_UPDATE,
      title: 'Due date changed',
      body: `${this.displayUserName(actor)} set the due date for "${task.taskTitle}" in ${task.projectName} to ${dueLabel}.`,
    });
  }

  async notifyComment(
    db: NotifyDb,
    actorUserId: string,
    actor: UserBrief | null,
    task: TaskNotificationContext,
    commentPreview: string,
  ): Promise<void> {
    await this.notifications.notifyProjectMembers(db, {
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      taskId: task.taskId,
      actorUserId,
      type: NotificationType.TASK_UPDATE,
      title: 'New comment',
      body: `${this.displayUserName(actor)} commented on "${task.taskTitle}" in ${task.projectName}: ${commentPreview}`,
    });
  }

  displayUserName(user: UserBrief | null | undefined): string {
    if (!user) {
      return 'Someone';
    }
    return user.name?.trim() || user.email;
  }

  async loadActor(
    db: Pick<PrismaService, 'user'>,
    userId: string,
  ): Promise<UserBrief | null> {
    return db.user.findUnique({
      where: { id: userId },
      select: userBriefSelect,
    });
  }

  private formatStatus(status: TaskStatus): string {
    return formatStatusLabel(status as SharedTaskStatus);
  }
}
