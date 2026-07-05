import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { AddProjectMemberDto } from './dto/index.js';
import { ProjectMemberWithUser, ProjectMembersService } from './project-members.service.js';

@ApiTags('project-members')
@ApiBearerAuth()
@Controller('projects/:projectId/members')
export class ProjectMembersController {
  constructor(
    private readonly projectMembersService: ProjectMembersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List project members' })
  list(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ): Promise<ProjectMemberWithUser[]> {
    return this.projectMembersService.list(projectId, user.userId);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiOperation({ summary: 'Add a member to a project' })
  add(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: AddProjectMemberDto,
  ): Promise<ProjectMemberWithUser> {
    return this.projectMembersService.add(projectId, user.userId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':userId')
  @ApiOperation({ summary: 'Remove a member from a project' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Param('userId') memberUserId: string,
  ): Promise<void> {
    return this.projectMembersService.remove(
      projectId,
      user.userId,
      memberUserId,
    );
  }
}
