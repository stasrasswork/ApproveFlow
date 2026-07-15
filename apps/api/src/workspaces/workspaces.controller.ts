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
import { Workspace } from '../generated/prisma/client.js';
import { ParseCuidPipe } from '../common/parse-cuid.pipe.js';
import {
  AuthUser,
  CurrentUser,
} from '../auth/current-user.decorator.js';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto/index.js';
import {
  WorkspaceWithRole,
  WorkspacesService,
} from './workspaces.service.js';

@ApiTags('workspaces')
@ApiBearerAuth()
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  @ApiOperation({ summary: 'List workspaces for current user' })
  findAll(@CurrentUser() user: AuthUser): Promise<WorkspaceWithRole[]> {
    return this.workspacesService.findAll(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace by id' })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseCuidPipe) workspaceId: string,
  ): Promise<WorkspaceWithRole> {
    return this.workspacesService.findOne(workspaceId, user.userId);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiOperation({ summary: 'Create a workspace' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<Workspace> {
    return this.workspacesService.create(user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workspace name or slug' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseCuidPipe) workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    return this.workspacesService.update(workspaceId, user.userId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete workspace' })
  delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseCuidPipe) workspaceId: string,
  ): Promise<void> {
    return this.workspacesService.delete(workspaceId, user.userId);
  }
}
