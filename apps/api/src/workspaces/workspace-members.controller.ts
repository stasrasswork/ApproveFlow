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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthUser,
  CurrentUser,
} from '../auth/current-user.decorator.js';
import {
  InviteWorkspaceMemberDto,
  UpdateWorkspaceMemberDto,
} from './dto/index.js';
import {
  InviteWorkspaceResult,
  WorkspaceMemberWithUser,
  WorkspaceMembersService,
} from './workspace-members.service.js';

@ApiTags('workspace-members')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/members')
export class WorkspaceMembersController {
  constructor(
    private readonly workspaceMembersService: WorkspaceMembersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List workspace members' })
  list(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceMemberWithUser[]> {
    return this.workspaceMembersService.list(workspaceId, user.userId);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiOperation({ summary: 'Invite or add a workspace member' })
  invite(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: InviteWorkspaceMemberDto,
  ): Promise<InviteWorkspaceResult> {
    return this.workspaceMembersService.invite(workspaceId, user.userId, dto);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update member role' })
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
  @ApiOperation({ summary: 'Remove member from workspace' })
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
