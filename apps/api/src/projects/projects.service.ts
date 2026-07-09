import { Injectable } from '@nestjs/common';
import {
  ClientApprovalType,
  NotificationType,
  Project,
  ProjectStatus,
  TaskEventType,
  TaskStatus,
  WorkspaceRole,
} from '../generated/prisma/client.js';
import {
  assertAgencyProjectAccess,
  assertAgencyRole,
  assertWorkspaceExists,
  getWorkspaceRole,
  isAgencyRole,
  listClientsOutsideProject,
  loadProjectAndAssertAccess,
  type ClientOutsideProject,
  type UserBrief,
} from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateProjectDto, UpdateProjectDto } from './dto/index.js';
import { ProjectActivityService } from './project-activity.service.js';
import { ProjectStatsService } from './project-stats.service.js';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly projectStats: ProjectStatsService,
    private readonly projectActivity: ProjectActivityService,
  ) {}

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

    const created = await this.prisma.project.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
      },
    });

    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    await this.notifications.notifyWorkspaceMembers(this.prisma, {
      workspaceId,
      projectId: created.id,
      excludeUserId: userId,
      type: NotificationType.TASK_UPDATE,
      title: 'Project created',
      body: `${this.actorName(actor)} created project "${created.name}".`,
    });

    return created;
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
    const { role } = await loadProjectAndAssertAccess(this.prisma, projectId, userId);
    return this.projectStats.getStats(projectId, role, userId);
  }

  async getActivity(
    projectId: string,
    userId: string,
    limit = 50,
    cursor?: string,
  ): Promise<{ items: ProjectActivityItem[]; nextCursor: string | null }> {
    const { workspaceId, role } = await loadProjectAndAssertAccess(
      this.prisma,
      projectId,
      userId,
    );
    return this.projectActivity.getActivity(
      projectId,
      workspaceId,
      role,
      userId,
      limit,
      cursor,
    );
  }

  async getClientsOutside(
    projectId: string,
    userId: string,
  ): Promise<ClientOutsideProject[]> {
    const { workspaceId } = await assertAgencyProjectAccess(
      this.prisma,
      projectId,
      userId,
    );

    return listClientsOutsideProject(this.prisma, projectId, workspaceId);
  }

  async update(
    projectId: string,
    userId: string,
    dto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await assertAgencyProjectAccess(this.prisma, projectId, userId);
    const existing = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
    });
    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: dto,
    });
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    await this.notifications.notifyWorkspaceMembers(this.prisma, {
      workspaceId: project.workspaceId,
      projectId: updated.id,
      excludeUserId: userId,
      type: NotificationType.TASK_UPDATE,
      title:
        dto.status !== undefined && dto.status !== existing.status
          ? 'Project status updated'
          : 'Project updated',
      body:
        dto.status !== undefined && dto.status !== existing.status
          ? `${this.actorName(actor)} changed project "${updated.name}" status from ${this.formatProjectStatus(existing.status)} to ${this.formatProjectStatus(updated.status)}.`
          : `${this.actorName(actor)} updated project "${updated.name}".`,
    });

    return updated;
  }

  async delete(projectId: string, userId: string): Promise<void> {
    const project = await assertAgencyProjectAccess(this.prisma, projectId, userId);
    const existing = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { id: true, name: true },
    });

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    await this.notifications.notifyWorkspaceMembers(this.prisma, {
      workspaceId: project.workspaceId,
      projectId: existing.id,
      excludeUserId: userId,
      type: NotificationType.TASK_UPDATE,
      title: 'Project deleted',
      body: `${this.actorName(actor)} deleted project "${existing.name}".`,
    });
  }

  private actorName(actor: { email: string; name: string | null } | null): string {
    if (!actor) {
      return 'Someone';
    }
    return actor.name?.trim() || actor.email;
  }

  private formatProjectStatus(status: ProjectStatus): string {
    return status.toLowerCase();
  }
}
