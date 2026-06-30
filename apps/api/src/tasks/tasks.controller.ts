import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { TaskStatus } from '../generated/prisma/client.js';
import {
  AuthUser,
  CurrentUser,
} from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import {
  TransitionTaskDto,
  UpdateTaskDto,
  UpdateTaskDueDto,
} from './dto/index.js';
import {
  TaskDueChangeView,
  TaskEventView,
  TaskView,
  TasksService,
  type AllowedTransitionTarget,
} from './tasks.service.js';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<TaskView> {
    return this.tasksService.findOne(id, user.userId);
  }

  @Get(':id/events')
  getEvents(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<TaskEventView[]> {
    return this.tasksService.getEvents(id, user.userId);
  }

  @Get(':id/due-changes')
  getDueChanges(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<TaskDueChangeView[]> {
    return this.tasksService.getDueChanges(id, user.userId);
  }

  @Get(':id/allowed-transitions')
  getAllowedTransitions(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<{ from: TaskStatus; targets: AllowedTransitionTarget[] }> {
    return this.tasksService.getAllowedTransitions(id, user.userId);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskView> {
    return this.tasksService.update(id, user.userId, dto);
  }

  @Patch(':id/status')
  transition(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: TransitionTaskDto,
  ): Promise<TaskView> {
    return this.tasksService.transition(id, user.userId, dto);
  }

  @Patch(':id/due')
  updateDue(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDueDto,
  ): Promise<TaskView> {
    return this.tasksService.updateDue(id, user.userId, dto);
  }
}
