import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import {
  InviteWorkspaceMemberDto,
  UpdateWorkspaceMemberDto,
} from './dto/index.js';
import {
  WorkspaceMemberWithUser,
  WorkspaceMembersService,
} from './workspace-members.service.js';

@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/members')
export class WorkspaceMembersController {
  constructor(
    private readonly workspaceMembersService: WorkspaceMembersService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceMemberWithUser[]> {
    return this.workspaceMembersService.list(workspaceId, user.userId);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  invite(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: InviteWorkspaceMemberDto,
  ): Promise<WorkspaceMemberWithUser> {
    return this.workspaceMembersService.invite(workspaceId, user.userId, dto);
  }

  @Patch(':userId')
  updateRole(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') memberUserId: string,
    @Body() dto: UpdateWorkspaceMemberDto,
  ): Promise<WorkspaceMemberWithUser> {
    return this.workspaceMembersService.updateRole(
      workspaceId,
      user.userId,
      memberUserId,
      dto,
    );
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':userId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') memberUserId: string,
  ): Promise<void> {
    return this.workspaceMembersService.remove(
      workspaceId,
      user.userId,
      memberUserId,
    );
  }
}
