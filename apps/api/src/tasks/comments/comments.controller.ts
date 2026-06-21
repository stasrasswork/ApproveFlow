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
} from '../../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { CreateCommentDto } from './dto/index.js';
import { CommentView, CommentsService } from './comments.service.js';

@UseGuards(JwtAuthGuard)
@Controller('tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  findByTask(
    @CurrentUser() user: AuthUser,
    @Param('taskId') taskId: string,
  ): Promise<CommentView[]> {
    return this.commentsService.findByTask(taskId, user.userId);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentView> {
    return this.commentsService.create(taskId, user.userId, dto);
  }
}
