import { Injectable } from '@nestjs/common';
import { Comment } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateCommentDto } from '../dto/index.js';
import { TasksService } from '../tasks.service.js';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
  ) {}

  async findByTask(taskId: string, userId: string): Promise<Comment[]> {
    await this.tasksService.assertCanAccessTask(taskId, userId);

    return this.prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    taskId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<Comment> {
    await this.tasksService.assertCanAccessTask(taskId, userId);

    return this.prisma.comment.create({
      data: {
        taskId,
        authorId: userId,
        body: dto.body,
      },
    });
  }
}
