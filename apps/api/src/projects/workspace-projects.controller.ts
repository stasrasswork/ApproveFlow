import {
  Body,
  Controller,
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
import { Project } from '../generated/prisma/client.js';
import { ParseCuidPipe } from '../common/parse-cuid.pipe.js';
import {
  AuthUser,
  CurrentUser,
} from '../auth/current-user.decorator.js';
import { CreateProjectDto } from './dto/index.js';
import { ProjectsService } from './projects.service.js';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/projects')
export class WorkspaceProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List projects in a workspace' })
  findByWorkspace(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId', ParseCuidPipe) workspaceId: string,
  ): Promise<Project[]> {
    return this.projectsService.findByWorkspace(workspaceId, user.userId);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiOperation({ summary: 'Create a project in a workspace' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId', ParseCuidPipe) workspaceId: string,
    @Body() dto: CreateProjectDto,
  ): Promise<Project> {
    return this.projectsService.create(workspaceId, user.userId, dto);
  }
}
