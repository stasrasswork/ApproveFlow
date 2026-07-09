import { Injectable } from '@nestjs/common';
import { type WorkspaceRole } from '../generated/prisma/client.js';
import {
  buildTaskListWhere,
  loadWorkspaceRoleMap,
  userBriefSelect,
} from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  buildActivityCursorWhere,
  compareActivityItems,
  decodeActivityCursor,
  encodeActivityCursor,
} from './activity-cursor.js';
import type { ProjectActivityItem } from './projects.service.js';

@Injectable()
export class ProjectActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async getActivity(
    projectId: string,
    workspaceId: string,
    role: WorkspaceRole,
    userId: string,
    limit = 50,
    cursor?: string,
  ): Promise<{ items: ProjectActivityItem[]; nextCursor: string | null }> {
    const taskWhere = buildTaskListWhere(projectId, role, userId);
    const roleByUserId = await loadWorkspaceRoleMap(this.prisma, workspaceId);

    const parsedCursor = cursor ? decodeActivityCursor(cursor) : null;
    const cursorWhere = buildActivityCursorWhere(parsedCursor);
    const fetchLimit = limit + 1;

    const [events, comments, dueChanges] = await Promise.all([
      this.prisma.taskEvent.findMany({
        where: { task: taskWhere, ...cursorWhere },
        include: {
          task: { select: { id: true, title: true } },
          actor: { select: userBriefSelect },
        },
        take: fetchLimit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.comment.findMany({
        where: { task: taskWhere, ...cursorWhere },
        include: {
          task: { select: { id: true, title: true } },
          author: { select: userBriefSelect },
        },
        take: fetchLimit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.taskDueChange.findMany({
        where: { task: taskWhere, ...cursorWhere },
        include: {
          task: { select: { id: true, title: true } },
          changedBy: { select: userBriefSelect },
        },
        take: fetchLimit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);

    const items: ProjectActivityItem[] = [
      ...events.map((event) => ({
        type: 'status_changed' as const,
        id: event.id,
        occurredAt: event.createdAt,
        taskId: event.task.id,
        taskTitle: event.task.title,
        actor: event.actor,
        actorRole: roleByUserId.get(event.actorId) ?? null,
        eventType: event.type,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        approvalType: event.approvalType,
        comment: event.comment,
      })),
      ...comments.map((comment) => ({
        type: 'comment' as const,
        id: comment.id,
        occurredAt: comment.createdAt,
        taskId: comment.task.id,
        taskTitle: comment.task.title,
        author: comment.author,
        authorRole: roleByUserId.get(comment.authorId) ?? null,
        body: comment.body,
      })),
      ...dueChanges.map((change) => ({
        type: 'due_changed' as const,
        id: change.id,
        occurredAt: change.createdAt,
        taskId: change.task.id,
        taskTitle: change.task.title,
        changedBy: change.changedBy,
        changedByRole: roleByUserId.get(change.changedById) ?? null,
        oldDueAt: change.oldDueAt,
        newDueAt: change.newDueAt,
        reason: change.reason,
      })),
    ];

    items.sort(compareActivityItems);
    const page = items.slice(0, limit);
    const hasMore = items.length > limit;
    const lastItem = page.length > 0 ? page[page.length - 1] : undefined;
    const nextCursor =
      hasMore && lastItem
        ? encodeActivityCursor({
            occurredAt: lastItem.occurredAt.toISOString(),
            id: lastItem.id,
            type: lastItem.type,
          })
        : null;

    return { items: page, nextCursor };
  }
}
