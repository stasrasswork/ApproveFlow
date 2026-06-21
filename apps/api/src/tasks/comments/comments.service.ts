import { Injectable } from '@nestjs/common';
import { Comment } from '../../generated/prisma/client.js';
import {
  userBriefSelect,
  type UserBrief,
} from '../../common/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateCommentDto } from './dto/index.js';
import { TasksService } from '../tasks.service.js';

export type CommentView = Comment & {
  author: UserBrief;
};

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
  ) {}

  async findByTask(taskId: string, userId: string): Promise<CommentView[]> {
    await this.tasksService.assertCanAccessTask(taskId, userId);

    return this.prisma.comment.findMany({
      where: { taskId },
      include: { author: { select: userBriefSelect } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    taskId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<CommentView> {
    await this.tasksService.assertCanAccessTask(taskId, userId);

    return this.prisma.comment.create({
      data: {
        taskId,
        authorId: userId,
        body: dto.body,
      },
      include: { author: { select: userBriefSelect } },
    });
  }
}
