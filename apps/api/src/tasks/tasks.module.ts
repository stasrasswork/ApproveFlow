import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CommentsController } from './comments/comments.controller.js';
import { CommentsService } from './comments/comments.service.js';
import { ProjectTasksController } from './project-tasks.controller.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProjectTasksController, TasksController, CommentsController],
  providers: [TasksService, CommentsService],
})
export class TasksModule {}
