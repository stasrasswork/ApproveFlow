import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  WorkspaceMember,
  WorkspaceRole,
} from '../generated/prisma/client.js';
import {
  assertAgencyRole,
  assertAdminRole,
  assertWorkspaceExists,
  getWorkspaceRole,
  normalizeEmail,
  rethrowUniqueAsConflict,
  userBriefSelect,
  type UserBrief,
} from '../common/index.js';
import {
  WorkspaceInvitesService,
  type InviteWorkspaceResult,
} from '../invites/workspace-invites.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  InviteWorkspaceMemberDto,
  UpdateWorkspaceMemberDto,
} from './dto/index.js';

export type WorkspaceMemberWithUser = WorkspaceMember & {
  user: UserBrief;
};

export type { InviteWorkspaceResult };

@Injectable()
export class WorkspaceMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceInvites: WorkspaceInvitesService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberWithUser[]> {
    await assertWorkspaceExists(this.prisma, workspaceId);
    await getWorkspaceRole(this.prisma, workspaceId, userId);

    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: userBriefSelect },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async invite(
    workspaceId: string,
    userId: string,
    dto: InviteWorkspaceMemberDto,
  ): Promise<InviteWorkspaceResult> {
    await assertWorkspaceExists(this.prisma, workspaceId);

    const actorRole = await assertAgencyRole(
      this.prisma,
      workspaceId,
      userId,
      'Only admin or manager can invite workspace members',
    );

    if (dto.role === WorkspaceRole.ADMIN && actorRole !== WorkspaceRole.ADMIN) {
      throw new ForbiddenException('Only admin can assign admin role');
    }

    const email = normalizeEmail(dto.email);
    const targetUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!targetUser) {
      const workspace = await this.prisma.workspace.findUniqueOrThrow({
        where: { id: workspaceId },
        select: { name: true },
      });

      return this.workspaceInvites.createEmailInvite(
        workspaceId,
        userId,
        email,
        dto.role,
        workspace.name,
      );
    }

    if (targetUser.id === userId) {
      throw new BadRequestException('You are already a member of this workspace');
    }

    try {
      const member = await this.prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId: targetUser.id,
          role: dto.role,
        },
        include: {
          user: { select: userBriefSelect },
        },
      });
      const workspace = await this.prisma.workspace.findUniqueOrThrow({
        where: { id: workspaceId },
        select: { name: true },
      });
      await this.notifications.notifyWorkspaceInvite(this.prisma, {
        userId: targetUser.id,
        workspaceId,
        workspaceName: workspace.name,
      });
      const [actor, addedUser] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        }),
        this.prisma.user.findUnique({
          where: { id: targetUser.id },
          select: { email: true, name: true },
        }),
      ]);
      await this.notifications.notifyWorkspaceMembers(this.prisma, {
        workspaceId,
        excludeUserId: userId,
        type: NotificationType.TASK_UPDATE,
        title: 'Workspace member added',
        body: `${this.actorName(actor)} added ${this.actorName(addedUser)} to the workspace as ${dto.role.toLowerCase()}.`,
      });
      return { status: 'added', member };
    } catch (error) {
      rethrowUniqueAsConflict(
        error,
        'User is already a member of this workspace',
      );
    }
  }

  async updateRole(
    workspaceId: string,
    userId: string,
    memberUserId: string,
    dto: UpdateWorkspaceMemberDto,
  ): Promise<WorkspaceMemberWithUser> {
    await assertWorkspaceExists(this.prisma, workspaceId);
    await assertAdminRole(
      this.prisma,
      workspaceId,
      userId,
      'Only admin can change member roles',
    );

    const membership = await this.findMembership(workspaceId, memberUserId);

    if (
      membership.role === WorkspaceRole.ADMIN &&
      dto.role !== WorkspaceRole.ADMIN
    ) {
      await this.assertNotLastAdmin(workspaceId);
    }

    const updated = await this.prisma.workspaceMember.update({
      where: { id: membership.id },
      data: { role: dto.role },
      include: {
        user: { select: userBriefSelect },
      },
    });
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    await this.notifications.notifyWorkspaceMembers(this.prisma, {
      workspaceId,
      excludeUserId: userId,
      type: NotificationType.TASK_UPDATE,
      title: 'Workspace role updated',
      body: `${this.actorName(actor)} changed ${this.actorName(updated.user)} role to ${dto.role.toLowerCase()}.`,
    });
    return updated;
  }

  async remove(
    workspaceId: string,
    userId: string,
    memberUserId: string,
  ): Promise<void> {
    await assertWorkspaceExists(this.prisma, workspaceId);
    await assertAdminRole(
      this.prisma,
      workspaceId,
      userId,
      'Only admin can remove workspace members',
    );

    const membership = await this.findMembership(workspaceId, memberUserId);

    if (membership.role === WorkspaceRole.ADMIN) {
      await this.assertNotLastAdmin(workspaceId);
    }

    await this.prisma.workspaceMember.delete({
      where: { id: membership.id },
    });
    const [actor, removedUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      }),
      this.prisma.user.findUnique({
        where: { id: memberUserId },
        select: { email: true, name: true },
      }),
    ]);
    await this.notifications.notifyWorkspaceMembers(this.prisma, {
      workspaceId,
      excludeUserId: userId,
      type: NotificationType.TASK_UPDATE,
      title: 'Workspace member removed',
      body: `${this.actorName(actor)} removed ${this.actorName(removedUser)} from the workspace.`,
    });
  }

  private async findMembership(
    workspaceId: string,
    memberUserId: string,
  ): Promise<WorkspaceMember> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: memberUserId },
      },
    });

    if (!membership) {
      throw new NotFoundException('Workspace member not found');
    }

    return membership;
  }

  private async assertNotLastAdmin(workspaceId: string): Promise<void> {
    const adminCount = await this.prisma.workspaceMember.count({
      where: {
        workspaceId,
        role: WorkspaceRole.ADMIN,
      },
    });

    if (adminCount <= 1) {
      throw new BadRequestException('Workspace must have at least one admin');
    }
  }

  private actorName(
    actor: Pick<UserBrief, 'email' | 'name'> | null | undefined,
  ): string {
    if (!actor) {
      return 'Someone';
    }
    return actor.name?.trim() || actor.email;
  }
}
