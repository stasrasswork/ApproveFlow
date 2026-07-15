import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Project } from '../generated/prisma/client.js';
import { ParseCuidPipe } from '../common/parse-cuid.pipe.js';
import {
  AuthUser,
  CurrentUser,
} from '../auth/current-user.decorator.js';
import type { ClientOutsideProject } from '../common/index.js';
import { ProjectActivityQueryDto, UpdateProjectDto } from './dto/index.js';
import {
  ProjectActivityItem,
  ProjectStats,
  ProjectsService,
} from './projects.service.js';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get project by id' })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseCuidPipe) projectId: string,
  ): Promise<Project> {
    return this.projectsService.findOne(projectId, user.userId);
  }

  @Get(':id/clients-outside')
  @ApiOperation({ summary: 'Workspace clients not yet added to this project' })
  getClientsOutside(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseCuidPipe) projectId: string,
  ): Promise<ClientOutsideProject[]> {
    return this.projectsService.getClientsOutside(projectId, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseCuidPipe) projectId: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<Project> {
    return this.projectsService.update(projectId, user.userId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseCuidPipe) projectId: string,
  ): Promise<void> {
    return this.projectsService.delete(projectId, user.userId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Project task aggregates' })
  getStats(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseCuidPipe) projectId: string,
  ): Promise<ProjectStats> {
    return this.projectsService.getStats(projectId, user.userId);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Project activity feed' })
  getActivity(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseCuidPipe) projectId: string,
    @Query() query: ProjectActivityQueryDto,
  ): Promise<{ items: ProjectActivityItem[]; nextCursor: string | null }> {
    return this.projectsService.getActivity(
      projectId,
      user.userId,
      query.limit,
      query.cursor,
    );
  }
}
