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
import {
  AuthUser,
  CurrentUser,
} from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateTaskDto } from './dto/index.js';
import { TaskView, TasksService } from './tasks.service.js';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/tasks')
export class ProjectTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findByProject(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ): Promise<TaskView[]> {
    return this.tasksService.findByProject(projectId, user.userId);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskView> {
    return this.tasksService.create(projectId, user.userId, dto);
  }
}
