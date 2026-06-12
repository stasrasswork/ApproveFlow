import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientApprovalType,
  Task,
  TaskDueChange,
  TaskEvent,
  TaskStatus,
  WorkspaceRole,
} from '../generated/prisma/client.js';
import {
  assertAssigneeInProject,
  assertProjectAccess,
  getWorkspaceRole,
  isAgencyRole,
  loadProjectAndAssertAccess,
  userBriefSelect,
  type UserBrief,
} from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTaskDto, TransitionTaskDto, UpdateTaskDueDto } from './dto/index.js';
import {
  assertTransitionWithPayload,
  getAllowedTargetStatuses,
  TransitionNotAllowedError,
  TransitionValidationError,
} from './task-transition.js';

type TaskWithProject = Task & {
  project: { id: string; workspaceId: string };
};

export type TaskEventView = TaskEvent & {
  actor: UserBrief;
};

export type TaskDueChangeView = TaskDueChange & {
  changedBy: UserBrief;
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async getEvents(taskId: string, userId: string): Promise<TaskEventView[]> {
    const task = await this.loadTask(taskId);
    await this.assertTaskAccess(task, userId);
    return this.prisma.taskEvent.findMany({
      where: { taskId },
      include: { actor: { select: userBriefSelect } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getDueChanges(
    taskId: string,
    userId: string,
  ): Promise<TaskDueChangeView[]> {
    const task = await this.loadTask(taskId);
    await this.assertTaskAccess(task, userId);
    return this.prisma.taskDueChange.findMany({
      where: { taskId },
      include: { changedBy: { select: userBriefSelect } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByProject(projectId: string, userId: string): Promise<Task[]> {
    const { role } = await loadProjectAndAssertAccess(
      this.prisma,
      projectId,
      userId,
    );

    const where =
      role === WorkspaceRole.MEMBER
        ? { projectId, assigneeId: userId }
        : { projectId };

    return this.prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    projectId: string,
    userId: string,
    dto: CreateTaskDto,
  ): Promise<Task> {
    const { role, workspaceId } = await loadProjectAndAssertAccess(
      this.prisma,
      projectId,
      userId,
    );

    if (!isAgencyRole(role)) {
      throw new ForbiddenException('Only admin or manager can create tasks');
    }

    if (dto.assigneeId) {
      await assertAssigneeInProject(
        this.prisma,
        dto.assigneeId,
        projectId,
        workspaceId,
      );
    }

    return this.prisma.task.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        creatorId: userId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        sprintLabel: dto.sprintLabel,
        status: TaskStatus.BRIEF,
      },
    });
  }

  async findOne(taskId: string, userId: string): Promise<Task> {
    const task = await this.loadTask(taskId);
    await this.assertTaskAccess(task, userId);
    return task;
  }

  async assertCanAccessTask(taskId: string, userId: string): Promise<void> {
    const task = await this.loadTask(taskId);
    await this.assertTaskAccess(task, userId);
  }

  async transition(
    taskId: string,
    userId: string,
    dto: TransitionTaskDto,
  ): Promise<Task> {
    const task = await this.loadTask(taskId);
    const role = await this.getWorkspaceRoleForTask(task, userId);

    let resolved;
    try {
      resolved = assertTransitionWithPayload(
        role,
        task.status,
        dto.to,
        { comment: dto.comment },
      );
    } catch (error) {
      if (error instanceof TransitionNotAllowedError) {
        throw new ForbiddenException(error.message);
      }
      if (error instanceof TransitionValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const commentText = dto.comment?.trim();
    const fromStatus = task.status;

    return this.prisma.$transaction(async (tx) => {
      if (
        resolved.approvalType === ClientApprovalType.CHANGES_REQUESTED &&
        commentText
      ) {
        await tx.comment.create({
          data: {
            taskId,
            authorId: userId,
            body: commentText,
          },
        });
      }

      await tx.taskEvent.create({
        data: {
          taskId,
          actorId: userId,
          type: resolved.eventType,
          fromStatus,
          toStatus: dto.to,
          approvalType: resolved.approvalType,
          comment: commentText ?? null,
        },
      });

      return tx.task.update({
        where: { id: taskId },
        data: { status: dto.to },
      });
    });
  }

  async getAllowedTransitions(
    taskId: string,
    userId: string,
  ): Promise<{ targets: TaskStatus[] }> {
    const task = await this.loadTask(taskId);
    const role = await this.getWorkspaceRoleForTask(task, userId);

    return {
      targets: getAllowedTargetStatuses(role, task.status),
    };
  }

  async updateDue(
    taskId: string,
    userId: string,
    dto: UpdateTaskDueDto,
  ): Promise<Task> {
    const task = await this.loadTask(taskId);
    const role = await this.getWorkspaceRoleForTask(task, userId);

    if (!isAgencyRole(role)) {
      throw new ForbiddenException('Only admin or manager can change due date');
    }

    if (dto.dueAt === undefined && dto.reason === undefined) {
      throw new BadRequestException('Provide dueAt and/or reason');
    }

    const newDueAt =
      dto.dueAt === undefined
        ? task.dueAt
        : dto.dueAt === null
          ? null
          : new Date(dto.dueAt);

    const dueChanged =
      dto.dueAt !== undefined && !this.isSameDueAt(task.dueAt, newDueAt);

    if (!dueChanged) {
      return task;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.taskDueChange.create({
        data: {
          taskId,
          changedById: userId,
          oldDueAt: task.dueAt,
          newDueAt,
          reason: dto.reason,
        },
      });

      return tx.task.update({
        where: { id: taskId },
        data: { dueAt: newDueAt },
      });
    });
  }

  private isSameDueAt(
    left: Date | null,
    right: Date | null,
  ): boolean {
    if (left === null && right === null) {
      return true;
    }
    if (left === null || right === null) {
      return false;
    }
    return left.getTime() === right.getTime();
  }

  private async loadTask(taskId: string): Promise<TaskWithProject> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { id: true, workspaceId: true } } },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    return task;
  }

  private async assertTaskAccess(
    task: TaskWithProject,
    userId: string,
  ): Promise<void> {
    const role = await assertProjectAccess(
      this.prisma,
      task.project,
      userId,
    );

    if (role === WorkspaceRole.MEMBER && task.assigneeId !== userId) {
      throw new ForbiddenException('No access to this task');
    }
  }

  private async getWorkspaceRoleForTask(
    task: TaskWithProject,
    userId: string,
  ): Promise<WorkspaceRole> {
    await this.assertTaskAccess(task, userId);
    return getWorkspaceRole(
      this.prisma,
      task.project.workspaceId,
      userId,
    );
  }
}
