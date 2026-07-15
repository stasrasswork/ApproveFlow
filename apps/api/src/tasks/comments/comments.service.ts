import { Injectable } from '@nestjs/common';
import { Comment, WorkspaceRole } from '../../generated/prisma/client.js';
import {
  assertCanAccessTask,
  assertProjectExists,
  loadWorkspaceRoleMap,
  userBriefSelect,
  type UserBrief,
} from '../../common/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateCommentDto } from './dto/index.js';
import { TaskNotificationsService } from '../task-notifications.service.js';

export type CommentView = Comment & {
  author: UserBrief;
  authorRole: WorkspaceRole;
};

function previewComment(body: string, maxLength = 120): string {
  const trimmed = body.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskNotifications: TaskNotificationsService,
  ) {}

  async findByTask(taskId: string, userId: string): Promise<CommentView[]> {
    const { workspaceId } = await assertCanAccessTask(this.prisma, taskId, userId);
    const comments = await this.prisma.comment.findMany({
      where: { taskId },
      include: { author: { select: userBriefSelect } },
      orderBy: { createdAt: 'asc' },
    });

    return this.attachAuthorRoles(comments, workspaceId);
  }

  async create(
    taskId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<CommentView> {
    const { workspaceId, projectId } = await assertCanAccessTask(
      this.prisma,
      taskId,
      userId,
    );

    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        project: { select: { name: true } },
      },
    });

    await assertProjectExists(this.prisma, projectId);

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          taskId,
          authorId: userId,
          body: dto.body,
        },
        include: { author: { select: userBriefSelect } },
      });

      await this.taskNotifications.notifyComment(
        tx,
        userId,
        created.author,
        {
          taskId,
          projectId,
          workspaceId,
          taskTitle: task.title,
          projectName: task.project.name,
        },
        previewComment(dto.body),
      );

      return created;
    });

    const [view] = await this.attachAuthorRoles([comment], workspaceId);
    return view;
  }

  private async attachAuthorRoles(
    comments: (Comment & { author: UserBrief })[],
    workspaceId: string,
  ): Promise<CommentView[]> {
    if (comments.length === 0) {
      return [];
    }

    const authorIds = [...new Set(comments.map((comment) => comment.authorId))];
    const roleByUserId = await loadWorkspaceRoleMap(
      this.prisma,
      workspaceId,
      authorIds,
    );

    return comments.map((comment) => ({
      ...comment,
      authorRole: roleByUserId.get(comment.authorId) ?? WorkspaceRole.MEMBER,
    }));
  }
}
