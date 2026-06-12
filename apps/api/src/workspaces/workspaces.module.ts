import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { WorkspaceMembersController } from './workspace-members.controller.js';
import { WorkspaceMembersService } from './workspace-members.service.js';
import { WorkspacesController } from './workspaces.controller.js';
import { WorkspacesService } from './workspaces.service.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WorkspacesController, WorkspaceMembersController],
  providers: [WorkspacesService, WorkspaceMembersService],
  exports: [WorkspacesService, WorkspaceMembersService],
})
export class WorkspacesModule {}
