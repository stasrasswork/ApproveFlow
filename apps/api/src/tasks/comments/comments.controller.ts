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
import {
  AuthUser,
  CurrentUser,
} from '../../auth/current-user.decorator.js';
import { CreateCommentDto } from './dto/index.js';
import { CommentView, CommentsService } from './comments.service.js';

@ApiTags('comments')
@ApiBearerAuth()
@Controller('tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({ summary: 'List comments on a task' })
  findByTask(
    @CurrentUser() user: AuthUser,
    @Param('taskId') taskId: string,
  ): Promise<CommentView[]> {
    return this.commentsService.findByTask(taskId, user.userId);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiOperation({ summary: 'Add a comment to a task' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentView> {
    return this.commentsService.create(taskId, user.userId, dto);
  }
}
