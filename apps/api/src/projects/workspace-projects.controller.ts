import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Project } from '../generated/prisma/client.js';
import {
  AuthUser,
  CurrentUser,
} from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateProjectDto } from './dto/index.js';
import { ProjectsService } from './projects.service.js';

@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/projects')
export class WorkspaceProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findByWorkspace(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
  ): Promise<Project[]> {
    return this.projectsService.findByWorkspace(workspaceId, user.userId);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectDto,
  ): Promise<Project> {
    return this.projectsService.create(workspaceId, user.userId, dto);
  }
}
