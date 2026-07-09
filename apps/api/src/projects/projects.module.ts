import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProjectMembersController } from './project-members.controller.js';
import { ProjectMembersService } from './project-members.service.js';
import { ProjectActivityService } from './project-activity.service.js';
import { ProjectStatsService } from './project-stats.service.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';
import { WorkspaceProjectsController } from './workspace-projects.controller.js';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [
    WorkspaceProjectsController,
    ProjectsController,
    ProjectMembersController,
  ],
  providers: [
    ProjectsService,
    ProjectMembersService,
    ProjectStatsService,
    ProjectActivityService,
  ],
  exports: [ProjectsService, ProjectMembersService],
})
export class ProjectsModule {}
