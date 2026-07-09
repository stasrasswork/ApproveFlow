import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Task,
  TaskDueChange,
  TaskEvent,
  TaskStatus,
  WorkspaceRole,
} from '../generated/prisma/client.js';
import {
  assertAssigneeInProject,
  assertAgencyRole,
  assertProjectAccess,
  assertProjectAllowsTaskChanges,
  buildTaskListWhere,
  loadProjectAndAssertAccess,
  userBriefSelect,
  type UserBrief,
} from '../common/index.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateTaskDto,
  TransitionTaskDto,
  UpdateTaskDto,
  UpdateTaskDueDto,
} from './dto/index.js';
import {
  buildAllowedTransitionTargets,
  type AllowedTransitionTarget,
} from './domain/task-transition.js';
import {
  TaskNotificationsService,
  type TaskNotificationContext,
} from './task-notifications.service.js';
import { TasksTransitionService } from './tasks-transition.service.js';

type TaskWithProject = Task & {
  project: { id: string; workspaceId: string };
};

const taskViewInclude = {
  assignee: { select: userBriefSelect },
  creator: { select: userBriefSelect },
} as const;

export type TaskView = Task & {
  assignee: UserBrief | null;
  creator: UserBrief;
};

export type TaskEventView = TaskEvent & {
  actor: UserBrief;
};

export type TaskDueChangeView = TaskDueChange & {
  changedBy: UserBrief;
};

export type { AllowedTransitionTarget };

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly taskNotifications: TaskNotificationsService,
    private readonly transitionService: TasksTransitionService,
  ) {}

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

  async findByProject(projectId: string, userId: string): Promise<TaskView[]> {
    const { role } = await loadProjectAndAssertAccess(
      this.prisma,
      projectId,
      userId,
    );

    const where = buildTaskListWhere(projectId, role, userId);

    return this.prisma.task.findMany({
      where,
      include: taskViewInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    projectId: string,
    userId: string,
    dto: CreateTaskDto,
  ): Promise<TaskView> {
    const { workspaceId } = await loadProjectAndAssertAccess(
      this.prisma,
      projectId,
      userId,
    );

    await assertProjectAllowsTaskChanges(this.prisma, projectId);

    await assertAgencyRole(
      this.prisma,
      workspaceId,
      userId,
      'Only admin or manager can create tasks',
    );

    if (dto.assigneeId) {
      await assertAssigneeInProject(
        this.prisma,
        dto.assigneeId,
        projectId,
        workspaceId,
      );
    }

    const created = await this.prisma.task.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        creatorId: userId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        status: TaskStatus.BRIEF,
      },
      include: taskViewInclude,
    });

    const [actor, project] = await Promise.all([
      this.taskNotifications.loadActor(this.prisma, userId),
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true },
      }),
    ]);

    if (project) {
      await this.taskNotifications.notifyCreated(
        this.prisma,
        userId,
        actor,
        this.buildNotifyContext(created.id, projectId, workspaceId, created.title, project.name),
      );
    }

    return created;
  }

  async findOne(taskId: string, userId: string): Promise<TaskView> {
    const task = await this.loadTaskView(taskId);
    await this.assertTaskAccess(task, userId);
    const { project, ...view } = task;
    void project;
    return view;
  }

  async transition(
    taskId: string,
    userId: string,
    dto: TransitionTaskDto,
  ): Promise<TaskView> {
    const task = await this.loadTask(taskId);
    const role = await this.getWorkspaceRoleForTask(task, userId);

    await assertProjectAllowsTaskChanges(this.prisma, task.project.id);

    const result = await this.transitionService.transition(task, userId, role, dto);

    if (result.mailContext) {
      try {
        await this.notifications.sendTaskClientHandoffEmails(result.mailContext);
      } catch (error) {
        this.logger.error(
          `Failed to send handoff emails for task ${taskId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return result.taskView;
  }

  async getAllowedTransitions(
    taskId: string,
    userId: string,
  ): Promise<{ from: TaskStatus; targets: AllowedTransitionTarget[] }> {
    const task = await this.loadTask(taskId);
    const role = await this.getWorkspaceRoleForTask(task, userId);

    return {
      from: task.status,
      targets: buildAllowedTransitionTargets(role, task.status),
    };
  }

  async update(
    taskId: string,
    userId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskView> {
    const task = await this.loadTask(taskId);
    await this.assertTaskAccess(task, userId);
    await assertAgencyRole(
      this.prisma,
      task.project.workspaceId,
      userId,
      'Only admin or manager can update tasks',
    );

    await assertProjectAllowsTaskChanges(this.prisma, task.project.id);

    if (
      dto.title === undefined &&
      dto.description === undefined &&
      dto.assigneeId === undefined
    ) {
      throw new BadRequestException('Provide at least one field to update');
    }

    if (dto.assigneeId) {
      await assertAssigneeInProject(
        this.prisma,
        dto.assigneeId,
        task.project.id,
        task.project.workspaceId,
      );
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
      },
      include: taskViewInclude,
    });

    const [actor, project] = await Promise.all([
      this.taskNotifications.loadActor(this.prisma, userId),
      this.prisma.project.findUnique({
        where: { id: task.project.id },
        select: { name: true },
      }),
    ]);

    if (project) {
      await this.taskNotifications.notifyUpdated(
        this.prisma,
        userId,
        actor,
        this.buildNotifyContext(
          taskId,
          task.project.id,
          task.project.workspaceId,
          updated.title,
          project.name,
        ),
      );
    }

    return updated;
  }

  async updateDue(
    taskId: string,
    userId: string,
    dto: UpdateTaskDueDto,
  ): Promise<TaskView> {
    const task = await this.loadTask(taskId);
    await this.assertTaskAccess(task, userId);
    await assertAgencyRole(
      this.prisma,
      task.project.workspaceId,
      userId,
      'Only admin or manager can change due date',
    );
    await assertProjectAllowsTaskChanges(this.prisma, task.project.id);

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
      return this.getTaskView(taskId);
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

      await tx.task.update({
        where: { id: taskId },
        data: { dueAt: newDueAt },
      });

      const [actor, project] = await Promise.all([
        this.taskNotifications.loadActor(tx, userId),
        tx.project.findUnique({
          where: { id: task.project.id },
          select: { name: true },
        }),
      ]);

      if (project) {
        await this.taskNotifications.notifyDueChanged(
          tx,
          userId,
          actor,
          this.buildNotifyContext(
            taskId,
            task.project.id,
            task.project.workspaceId,
            task.title,
            project.name,
          ),
          newDueAt,
        );
      }

      return tx.task.findUniqueOrThrow({
        where: { id: taskId },
        include: taskViewInclude,
      });
    });
  }

  private getTaskView(taskId: string): Promise<TaskView> {
    return this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: taskViewInclude,
    });
  }

  private async loadTaskView(
    taskId: string,
  ): Promise<TaskView & { project: { id: string; workspaceId: string } }> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        ...taskViewInclude,
        project: { select: { id: true, workspaceId: true } },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    return task;
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
  ): Promise<WorkspaceRole> {
    const role = await assertProjectAccess(
      this.prisma,
      task.project,
      userId,
    );

    if (role === WorkspaceRole.MEMBER && task.assigneeId !== userId) {
      throw new ForbiddenException('No access to this task');
    }

    return role;
  }

  private getWorkspaceRoleForTask(
    task: TaskWithProject,
    userId: string,
  ): Promise<WorkspaceRole> {
    return this.assertTaskAccess(task, userId);
  }

  private buildNotifyContext(
    taskId: string,
    projectId: string,
    workspaceId: string,
    taskTitle: string,
    projectName: string,
  ): TaskNotificationContext {
    return { taskId, projectId, workspaceId, taskTitle, projectName };
  }
}
