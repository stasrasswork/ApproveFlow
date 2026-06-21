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
import { Workspace } from '../generated/prisma/client.js';
import {
  AuthUser,
  CurrentUser,
} from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto/index.js';
import {
  WorkspaceWithRole,
  WorkspacesService,
} from './workspaces.service.js';

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<WorkspaceWithRole[]> {
    return this.workspacesService.findAll(user.userId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') workspaceId: string,
  ): Promise<WorkspaceWithRole> {
    return this.workspacesService.findOne(workspaceId, user.userId);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<Workspace> {
    return this.workspacesService.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    return this.workspacesService.update(workspaceId, user.userId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(
    @CurrentUser() user: AuthUser,
    @Param('id') workspaceId: string,
  ): Promise<void> {
    return this.workspacesService.delete(workspaceId, user.userId);
  }
}
