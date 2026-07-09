import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { CommentsController } from './comments/comments.controller.js';
import { CommentsService } from './comments/comments.service.js';
import { ProjectTasksController } from './project-tasks.controller.js';
import { TaskNotificationsService } from './task-notifications.service.js';
import { TasksController } from './tasks.controller.js';
import { TasksTransitionService } from './tasks-transition.service.js';
import { TasksService } from './tasks.service.js';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ProjectTasksController, TasksController, CommentsController],
  providers: [
    TasksService,
    CommentsService,
    TaskNotificationsService,
    TasksTransitionService,
  ],
})
export class TasksModule {}
