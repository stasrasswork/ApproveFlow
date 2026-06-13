import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProjectMember } from '../generated/prisma/client.js';
import {
  AuthUser,
  CurrentUser,
} from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AddProjectMemberDto } from './dto/index.js';
import { ProjectMembersService } from './project-members.service.js';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/members')
export class ProjectMembersController {
  constructor(
    private readonly projectMembersService: ProjectMembersService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ): Promise<ProjectMember[]> {
    return this.projectMembersService.list(projectId, user.userId);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  add(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: AddProjectMemberDto,
  ): Promise<ProjectMember> {
    return this.projectMembersService.add(projectId, user.userId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':userId')
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
