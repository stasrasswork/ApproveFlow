import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { WorkspaceInvitesService } from './workspace-invites.service.js';

@Module({
  imports: [NotificationsModule],
  providers: [WorkspaceInvitesService],
  exports: [WorkspaceInvitesService],
})
export class InvitesModule {}
