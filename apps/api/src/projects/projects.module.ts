import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProjectMembersController } from './project-members.controller.js';
import { ProjectMembersService } from './project-members.service.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';
import { WorkspaceProjectsController } from './workspace-projects.controller.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    WorkspaceProjectsController,
    ProjectsController,
    ProjectMembersController,
  ],
  providers: [ProjectsService, ProjectMembersService],
  exports: [ProjectsService, ProjectMembersService],
})
export class ProjectsModule {}
