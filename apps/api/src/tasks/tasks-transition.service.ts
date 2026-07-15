import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  ClientApprovalType,
  TaskStatus,
  WorkspaceRole,
} from '../generated/prisma/client.js';
import {
  ensureProjectClients,
  listProjectClientUserIds,
  userBriefSelect,
} from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TransitionTaskDto } from './dto/index.js';
import {
  assertTransitionWithPayload,
  TransitionNotAllowedError,
  TransitionValidationError,
} from './domain/task-transition.js';
import { TaskNotificationsService } from './task-notifications.service.js';

@Injectable()
export class TasksTransitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskNotifications: TaskNotificationsService,
  ) {}

  async transition(
    task: {
      id: string;
      title: string;
      status: TaskStatus;
      project: { id: string; workspaceId: string };
    },
    userId: string,
    role: WorkspaceRole,
    dto: TransitionTaskDto,
  ) {
    const fromStatus = task.status;

    // Idempotent no-op before matrix assert (from === to is otherwise forbidden).
    if (fromStatus === dto.to) {
      const taskView = await this.prisma.task.findUniqueOrThrow({
        where: { id: task.id },
        include: {
          assignee: { select: userBriefSelect },
          creator: { select: userBriefSelect },
        },
      });
      return { taskView, mailContext: null };
    }

    let resolved;
    try {
      resolved = assertTransitionWithPayload(role, fromStatus, dto.to, {
        comment: dto.comment,
      });
    } catch (error) {
      if (error instanceof TransitionNotAllowedError) {
        throw new ForbiddenException(error.message);
      }
      if (error instanceof TransitionValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const commentText = dto.comment?.trim();

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.updateMany({
        where: { id: task.id, status: fromStatus },
        data: { status: dto.to },
      });

      if (updated.count === 0) {
        const current = await tx.task.findUniqueOrThrow({
          where: { id: task.id },
          select: { status: true },
        });

        if (current.status === dto.to) {
          const taskView = await tx.task.findUniqueOrThrow({
            where: { id: task.id },
            include: {
              assignee: { select: userBriefSelect },
              creator: { select: userBriefSelect },
            },
          });
          return { taskView, mailContext: null };
        }

        throw new ConflictException('Task status changed concurrently');
      }

      if (
        resolved.approvalType === ClientApprovalType.CHANGES_REQUESTED &&
        commentText
      ) {
        await tx.comment.create({
          data: {
            taskId: task.id,
            authorId: userId,
            body: commentText,
          },
        });
      }

      let clientUserIds: string[] = [];
      if (dto.to === TaskStatus.CLIENT_HANDOFF) {
        if ((dto.clientUserIds?.length ?? 0) > 0) {
          await ensureProjectClients(
            tx,
            task.project.id,
            task.project.workspaceId,
            dto.clientUserIds!,
          );
          clientUserIds = [...new Set(dto.clientUserIds!)];
        } else {
          clientUserIds = await listProjectClientUserIds(
            tx,
            task.project.id,
            task.project.workspaceId,
          );
        }

        if (clientUserIds.length === 0) {
          throw new BadRequestException(
            'Send to client requires at least one project client',
          );
        }
      }

      const event = await tx.taskEvent.create({
        data: {
          taskId: task.id,
          actorId: userId,
          type: resolved.eventType,
          fromStatus,
          toStatus: dto.to,
          approvalType: resolved.approvalType,
          comment: commentText ?? null,
        },
      });

      if (resolved.eventType === 'HANDOFF_ACK') {
        await tx.clientHandoffAck.create({
          data: {
            taskId: task.id,
            taskEventId: event.id,
            actorId: userId,
          },
        });
      }

      if (resolved.eventType === 'CLIENT_APPROVAL' && resolved.approvalType) {
        await tx.clientApprovalAction.create({
          data: {
            taskId: task.id,
            taskEventId: event.id,
            actorId: userId,
            action: resolved.approvalType,
            comment: commentText ?? null,
          },
        });
      }

      const project = await tx.project.findUniqueOrThrow({
        where: { id: task.project.id },
        select: { name: true, workspaceId: true },
      });
      const actor = await this.taskNotifications.loadActor(tx, userId);
      const notifyContext = {
        taskId: task.id,
        projectId: task.project.id,
        workspaceId: project.workspaceId,
        taskTitle: task.title,
        projectName: project.name,
      };

      await this.taskNotifications.notifyStatusChanged(
        tx,
        userId,
        actor,
        notifyContext,
        fromStatus,
        dto.to,
        dto.to === TaskStatus.CLIENT_HANDOFF
          ? { recipientUserIds: clientUserIds }
          : undefined,
      );

      const taskView = await tx.task.findUniqueOrThrow({
        where: { id: task.id },
        include: {
          assignee: { select: userBriefSelect },
          creator: { select: userBriefSelect },
        },
      });

      return {
        taskView,
        mailContext:
          dto.to === TaskStatus.CLIENT_HANDOFF && clientUserIds.length > 0
            ? {
                clientUserIds,
                workspaceId: project.workspaceId,
                taskId: task.id,
                projectId: task.project.id,
                taskTitle: task.title,
                projectName: project.name,
              }
            : null,
      };
    });

    return result;
  }
}
