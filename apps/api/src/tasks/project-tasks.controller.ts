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
import { ParseCuidPipe } from '../common/parse-cuid.pipe.js';
import {
  AuthUser,
  CurrentUser,
} from '../auth/current-user.decorator.js';
import { CreateTaskDto } from './dto/index.js';
import { TaskView, TasksService } from './tasks.service.js';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('projects/:projectId/tasks')
export class ProjectTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks in a project' })
  findByProject(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseCuidPipe) projectId: string,
  ): Promise<TaskView[]> {
    return this.tasksService.findByProject(projectId, user.userId);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiOperation({ summary: 'Create a task in a project' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseCuidPipe) projectId: string,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskView> {
    return this.tasksService.create(projectId, user.userId, dto);
  }
}
