import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Project } from '../generated/prisma/client.js';
import {
  AuthUser,
  CurrentUser,
} from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateProjectDto, UpdateProjectDto } from './dto/index.js';
import {
  ProjectActivityItem,
  ProjectStats,
  ProjectsService,
} from './projects.service.js';

@UseGuards(JwtAuthGuard)
@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('workspaces/:workspaceId/projects')
  findByWorkspace(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
  ): Promise<Project[]> {
    return this.projectsService.findByWorkspace(workspaceId, user.userId);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('workspaces/:workspaceId/projects')
  create(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectDto,
  ): Promise<Project> {
    return this.projectsService.create(workspaceId, user.userId, dto);
  }

  @Get('projects/:id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') projectId: string,
  ): Promise<Project> {
    return this.projectsService.findOne(projectId, user.userId);
  }

  @Put('projects/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') projectId: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<Project> {
    return this.projectsService.update(projectId, user.userId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('projects/:id')
  delete(
    @CurrentUser() user: AuthUser,
    @Param('id') projectId: string,
  ): Promise<void> {
    return this.projectsService.delete(projectId, user.userId);
  }

  @Get('projects/:id/stats')
  getStats(
    @CurrentUser() user: AuthUser,
    @Param('id') projectId: string,
  ): Promise<ProjectStats> {
    return this.projectsService.getStats(projectId, user.userId);
  }

  @Get('projects/:id/activity')
  getActivity(
    @CurrentUser() user: AuthUser,
    @Param('id') projectId: string,
  ): Promise<ProjectActivityItem[]> {
    return this.projectsService.getActivity(projectId, user.userId);
  }
}
