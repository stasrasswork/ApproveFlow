import {
  Injectable,
} from '@nestjs/common';
import {
  ClientApprovalType,
  Project,
  TaskEventType,
  TaskStatus,
  WorkspaceRole,
} from '../generated/prisma/client.js';
import {
  assertAgencyRole,
  assertWorkspaceExists,
  getWorkspaceRole,
  isAgencyRole,
  loadProjectAndAssertAccess,
  userBriefSelect,
  type UserBrief,
} from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProjectDto, UpdateProjectDto } from './dto/index.js';

export type ProjectStats = {
  clientHandoff: number;
  clientApproval: number;
  notDone: number;
  overdueDue: number;
};

export type ProjectActivityItem =
  | {
      type: 'status_changed';
      id: string;
      occurredAt: Date;
      taskId: string;
      taskTitle: string;
      actor: UserBrief;
      actorRole: WorkspaceRole | null;
      eventType: TaskEventType;
      fromStatus: TaskStatus;
      toStatus: TaskStatus;
      approvalType: ClientApprovalType | null;
      comment: string | null;
    }
  | {
      type: 'comment';
      id: string;
      occurredAt: Date;
      taskId: string;
      taskTitle: string;
      author: UserBrief;
      authorRole: WorkspaceRole | null;
      body: string;
    }
  | {
      type: 'due_changed';
      id: string;
      occurredAt: Date;
      taskId: string;
      taskTitle: string;
      changedBy: UserBrief;
      changedByRole: WorkspaceRole | null;
      oldDueAt: Date | null;
      newDueAt: Date | null;
      reason: string | null;
    };

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    workspaceId: string,
    userId: string,
    dto: CreateProjectDto,
  ): Promise<Project> {
    await assertWorkspaceExists(this.prisma, workspaceId);
    await assertAgencyRole(
      this.prisma,
      workspaceId,
      userId,
      'Only admin or manager can manage projects',
    );

    return this.prisma.project.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async findByWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<Project[]> {
    await assertWorkspaceExists(this.prisma, workspaceId);
    const role = await getWorkspaceRole(this.prisma, workspaceId, userId);

    if (isAgencyRole(role)) {
      return this.prisma.project.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.project.findMany({
      where: {
        workspaceId,
        members: { some: { userId } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(projectId: string, userId: string): Promise<Project> {
    await loadProjectAndAssertAccess(this.prisma, projectId, userId);
    return this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
    });
  }

  async getStats(projectId: string, userId: string): Promise<ProjectStats> {
    const taskWhere = await this.buildTaskScopeWhere(projectId, userId);
    const now = new Date();

    const [clientHandoff, clientApproval, notDone, overdueDue] =
      await Promise.all([
        this.prisma.task.count({
          where: { ...taskWhere, status: TaskStatus.CLIENT_HANDOFF },
        }),
        this.prisma.task.count({
          where: { ...taskWhere, status: TaskStatus.CLIENT_APPROVAL },
        }),
        this.prisma.task.count({
          where: { ...taskWhere, status: { not: TaskStatus.DONE } },
        }),
        this.prisma.task.count({
          where: {
            ...taskWhere,
            status: { not: TaskStatus.DONE },
            dueAt: { lt: now },
          },
        }),
      ]);

    return { clientHandoff, clientApproval, notDone, overdueDue };
  }

  async getActivity(
    projectId: string,
    userId: string,
  ): Promise<ProjectActivityItem[]> {
    const { workspaceId } = await loadProjectAndAssertAccess(
      this.prisma,
      projectId,
      userId,
    );
    const taskWhere = await this.buildTaskScopeWhere(projectId, userId);

    const roleByUserId = new Map(
      (
        await this.prisma.workspaceMember.findMany({
          where: { workspaceId },
          select: { userId: true, role: true },
        })
      ).map((membership) => [membership.userId, membership.role]),
    );

    const [events, comments, dueChanges] = await Promise.all([
      this.prisma.taskEvent.findMany({
        where: { task: taskWhere },
        include: {
          task: { select: { id: true, title: true } },
          actor: { select: userBriefSelect },
        },
      }),
      this.prisma.comment.findMany({
        where: { task: taskWhere },
        include: {
          task: { select: { id: true, title: true } },
          author: { select: userBriefSelect },
        },
      }),
      this.prisma.taskDueChange.findMany({
        where: { task: taskWhere },
        include: {
          task: { select: { id: true, title: true } },
          changedBy: { select: userBriefSelect },
        },
      }),
    ]);

    const items: ProjectActivityItem[] = [
      ...events.map((event) => ({
        type: 'status_changed' as const,
        id: event.id,
        occurredAt: event.createdAt,
        taskId: event.task.id,
        taskTitle: event.task.title,
        actor: event.actor,
        actorRole: roleByUserId.get(event.actorId) ?? null,
        eventType: event.type,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        approvalType: event.approvalType,
        comment: event.comment,
      })),
      ...comments.map((comment) => ({
        type: 'comment' as const,
        id: comment.id,
        occurredAt: comment.createdAt,
        taskId: comment.task.id,
        taskTitle: comment.task.title,
        author: comment.author,
        authorRole: roleByUserId.get(comment.authorId) ?? null,
        body: comment.body,
      })),
      ...dueChanges.map((change) => ({
        type: 'due_changed' as const,
        id: change.id,
        occurredAt: change.createdAt,
        taskId: change.task.id,
        taskTitle: change.task.title,
        changedBy: change.changedBy,
        changedByRole: roleByUserId.get(change.changedById) ?? null,
        oldDueAt: change.oldDueAt,
        newDueAt: change.newDueAt,
        reason: change.reason,
      })),
    ];

    items.sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
    return items;
  }

  async update(
    projectId: string,
    userId: string,
    dto: UpdateProjectDto,
  ): Promise<Project> {
    const { workspaceId } = await loadProjectAndAssertAccess(
      this.prisma,
      projectId,
      userId,
    );

    await assertAgencyRole(
      this.prisma,
      workspaceId,
      userId,
      'Only admin or manager can manage projects',
    );

    return this.prisma.project.update({
      where: { id: projectId },
      data: dto,
    });
  }

  async delete(projectId: string, userId: string): Promise<void> {
    const { workspaceId } = await loadProjectAndAssertAccess(
      this.prisma,
      projectId,
      userId,
    );

    await assertAgencyRole(
      this.prisma,
      workspaceId,
      userId,
      'Only admin or manager can manage projects',
    );

    await this.prisma.project.delete({
      where: { id: projectId },
    });
  }

  private async buildTaskScopeWhere(
    projectId: string,
    userId: string,
  ): Promise<{ projectId: string; assigneeId?: string }> {
    const { role } = await loadProjectAndAssertAccess(
      this.prisma,
      projectId,
      userId,
    );

    if (role === WorkspaceRole.MEMBER) {
      return { projectId, assigneeId: userId };
    }

    return { projectId };
  }
}
