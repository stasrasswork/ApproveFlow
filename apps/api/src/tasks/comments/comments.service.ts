import { Injectable } from '@nestjs/common';
import {
  Comment,
  WorkspaceRole,
} from '../../generated/prisma/client.js';
import {
  userBriefSelect,
  loadWorkspaceRoleMap,
  type UserBrief,
} from '../../common/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateCommentDto } from './dto/index.js';
import { TasksService } from '../tasks.service.js';

export type CommentView = Comment & {
  author: UserBrief;
  authorRole: WorkspaceRole;
};

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
  ) {}

  async findByTask(taskId: string, userId: string): Promise<CommentView[]> {
    await this.tasksService.assertCanAccessTask(taskId, userId);

    const workspaceId = await this.getTaskWorkspaceId(taskId);
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
    await this.tasksService.assertCanAccessTask(taskId, userId);

    const workspaceId = await this.getTaskWorkspaceId(taskId);
    const comment = await this.prisma.comment.create({
      data: {
        taskId,
        authorId: userId,
        body: dto.body,
      },
      include: { author: { select: userBriefSelect } },
    });

    const [view] = await this.attachAuthorRoles([comment], workspaceId);
    return view;
  }

  private async getTaskWorkspaceId(taskId: string): Promise<string> {
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      select: { project: { select: { workspaceId: true } } },
    });
    return task.project.workspaceId;
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
