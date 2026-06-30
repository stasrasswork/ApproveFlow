import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
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
import { PrismaService } from '../prisma/prisma.service.js';
import {
  InviteWorkspaceMemberDto,
  UpdateWorkspaceMemberDto,
} from './dto/index.js';

export type WorkspaceMemberWithUser = WorkspaceMember & {
  user: UserBrief;
};

@Injectable()
export class WorkspaceMembersService {
  constructor(private readonly prisma: PrismaService) {}

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
  ): Promise<WorkspaceMemberWithUser> {
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
      throw new NotFoundException(
        'User not found. Ask them to register before inviting.',
      );
    }

    if (targetUser.id === userId) {
      throw new BadRequestException('You are already a member of this workspace');
    }

    try {
      return await this.prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId: targetUser.id,
          role: dto.role,
        },
        include: {
          user: { select: userBriefSelect },
        },
      });
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

    return this.prisma.workspaceMember.update({
      where: { id: membership.id },
      data: { role: dto.role },
      include: {
        user: { select: userBriefSelect },
      },
    });
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
}
