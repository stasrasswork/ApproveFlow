import { Controller, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator.js';
import {
  NotificationView,
  NotificationsService,
} from './notifications.service.js';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user' })
  list(@CurrentUser() user: AuthUser): Promise<NotificationView[]> {
    return this.notificationsService.list(user.userId);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread notification count' })
  unreadCount(@CurrentUser() user: AuthUser): Promise<{ count: number }> {
    return this.notificationsService
      .unreadCount(user.userId)
      .then((count) => ({ count }));
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: AuthUser): Promise<void> {
    return this.notificationsService.markAllRead(user.userId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id') notificationId: string,
  ): Promise<void> {
    return this.notificationsService.markRead(user.userId, notificationId);
  }
}
