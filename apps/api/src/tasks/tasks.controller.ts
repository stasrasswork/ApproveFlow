import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Task, TaskStatus } from '../generated/prisma/client.js';
import {
  AuthUser,
  CurrentUser,
} from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import {
  CreateTaskDto,
  TransitionTaskDto,
  UpdateTaskDto,
  UpdateTaskDueDto,
} from './dto/index.js';
import {
  TaskDueChangeView,
  TaskEventView,
  TasksService,
} from './tasks.service.js';

@UseGuards(JwtAuthGuard)
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('projects/:projectId/tasks')
  findByProject(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ): Promise<Task[]> {
    return this.tasksService.findByProject(projectId, user.userId);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('projects/:projectId/tasks')
  create(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
  ): Promise<Task> {
    return this.tasksService.create(projectId, user.userId, dto);
  }

  @Get('tasks/:id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<Task> {
    return this.tasksService.findOne(id, user.userId);
  }

  @Get('tasks/:id/events')
  getEvents(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<TaskEventView[]> {
    return this.tasksService.getEvents(id, user.userId);
  }

  @Get('tasks/:id/due-changes')
  getDueChanges(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<TaskDueChangeView[]> {
    return this.tasksService.getDueChanges(id, user.userId);
  }

  @Get('tasks/:id/allowed-transitions')
  getAllowedTransitions(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<{ targets: TaskStatus[] }> {
    return this.tasksService.getAllowedTransitions(id, user.userId);
  }

  @Patch('tasks/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<Task> {
    return this.tasksService.update(id, user.userId, dto);
  }

  @Patch('tasks/:id/status')
  transition(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: TransitionTaskDto,
  ): Promise<Task> {
    return this.tasksService.transition(id, user.userId, dto);
  }

  @Patch('tasks/:id/due')
  updateDue(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDueDto,
  ): Promise<Task> {
    return this.tasksService.updateDue(id, user.userId, dto);
  }
}
