import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Project } from '../generated/prisma/client.js';
import {
  AuthUser,
  CurrentUser,
} from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UpdateProjectDto } from './dto/index.js';
import {
  ProjectActivityItem,
  ProjectStats,
  ProjectsService,
} from './projects.service.js';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') projectId: string,
  ): Promise<Project> {
    return this.projectsService.findOne(projectId, user.userId);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') projectId: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<Project> {
    return this.projectsService.update(projectId, user.userId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(
    @CurrentUser() user: AuthUser,
    @Param('id') projectId: string,
  ): Promise<void> {
    return this.projectsService.delete(projectId, user.userId);
  }

  @Get(':id/stats')
  getStats(
    @CurrentUser() user: AuthUser,
    @Param('id') projectId: string,
  ): Promise<ProjectStats> {
    return this.projectsService.getStats(projectId, user.userId);
  }

  @Get(':id/activity')
  getActivity(
    @CurrentUser() user: AuthUser,
    @Param('id') projectId: string,
  ): Promise<ProjectActivityItem[]> {
    return this.projectsService.getActivity(projectId, user.userId);
  }
}
