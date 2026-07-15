import { Module } from '@nestjs/common';
import { InvitesModule } from '../invites/invites.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { WorkspaceMembersController } from './workspace-members.controller.js';
import { WorkspaceMembersService } from './workspace-members.service.js';
import { WorkspacesController } from './workspaces.controller.js';
import { WorkspacesService } from './workspaces.service.js';

@Module({
  imports: [PrismaModule, InvitesModule, NotificationsModule],
  controllers: [WorkspacesController, WorkspaceMembersController],
  providers: [WorkspacesService, WorkspaceMembersService],
})
export class WorkspacesModule {}
