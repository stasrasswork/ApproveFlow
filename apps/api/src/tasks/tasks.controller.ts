import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TaskStatus } from '../generated/prisma/client.js';
import { ParseCuidPipe } from '../common/parse-cuid.pipe.js';
import {
  AuthUser,
  CurrentUser,
} from '../auth/current-user.decorator.js';
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

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get task by id' })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseCuidPipe) id: string,
  ): Promise<TaskView> {
    return this.tasksService.findOne(id, user.userId);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'List task status change events' })
  getEvents(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseCuidPipe) id: string,
  ): Promise<TaskEventView[]> {
    return this.tasksService.getEvents(id, user.userId);
  }

  @Get(':id/due-changes')
  @ApiOperation({ summary: 'List task due date change history' })
  getDueChanges(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseCuidPipe) id: string,
  ): Promise<TaskDueChangeView[]> {
    return this.tasksService.getDueChanges(id, user.userId);
  }

  @Get(':id/allowed-transitions')
  @ApiOperation({ summary: 'Get allowed status transitions for current user' })
  getAllowedTransitions(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseCuidPipe) id: string,
  ): Promise<{ from: TaskStatus; targets: AllowedTransitionTarget[] }> {
    return this.tasksService.getAllowedTransitions(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task fields' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskView> {
    return this.tasksService.update(id, user.userId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transition task status' })
  transition(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: TransitionTaskDto,
  ): Promise<TaskView> {
    return this.tasksService.transition(id, user.userId, dto);
  }

  @Patch(':id/due')
  @ApiOperation({ summary: 'Update task due date' })
  updateDue(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: UpdateTaskDueDto,
  ): Promise<TaskView> {
    return this.tasksService.updateDue(id, user.userId, dto);
  }
}
