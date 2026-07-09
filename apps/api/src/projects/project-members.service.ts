import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, ProjectMember } from '../generated/prisma/client.js';
import {
  assertAgencyProjectAccess,
  rethrowUniqueAsConflict,
  userBriefSelect,
  type UserBrief,
} from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AddProjectMemberDto } from './dto/index.js';

export type ProjectMemberWithUser = ProjectMember & {
  user: UserBrief;
};

@Injectable()
export class ProjectMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(
    projectId: string,
    userId: string,
  ): Promise<ProjectMemberWithUser[]> {
    await assertAgencyProjectAccess(this.prisma, projectId, userId);

    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: userBriefSelect } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async add(
    projectId: string,
    userId: string,
    dto: AddProjectMemberDto,
  ): Promise<ProjectMemberWithUser> {
    const project = await assertAgencyProjectAccess(
      this.prisma,
      projectId,
      userId,
    );

    const workspaceMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId: dto.userId,
        },
      },
    });

    if (!workspaceMember) {
      throw new BadRequestException('User is not a member of this workspace');
    }

    try {
      const member = await this.prisma.projectMember.create({
        data: {
          projectId,
          userId: dto.userId,
        },
        include: { user: { select: userBriefSelect } },
      });
      const [actor, addedUser] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        }),
        this.prisma.user.findUnique({
          where: { id: dto.userId },
          select: { email: true, name: true },
        }),
      ]);
      await this.notifications.notifyWorkspaceMembers(this.prisma, {
        workspaceId: project.workspaceId,
        projectId,
        excludeUserId: userId,
        type: NotificationType.TASK_UPDATE,
        title: 'Project member added',
        body: `${this.actorName(actor)} added ${this.actorName(addedUser)} to the project.`,
      });
      return member;
    } catch (error) {
      rethrowUniqueAsConflict(
        error,
        'User is already a member of this project',
      );
    }
  }

  async remove(
    projectId: string,
    userId: string,
    memberUserId: string,
  ): Promise<void> {
    const project = await assertAgencyProjectAccess(this.prisma, projectId, userId);

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: memberUserId },
      },
    });

    if (!membership) {
      throw new NotFoundException('Project member not found');
    }

    await this.prisma.projectMember.delete({
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
      workspaceId: project.workspaceId,
      projectId,
      excludeUserId: userId,
      type: NotificationType.TASK_UPDATE,
      title: 'Project member removed',
      body: `${this.actorName(actor)} removed ${this.actorName(removedUser)} from the project.`,
    });
  }

  private actorName(actor: { email: string; name: string | null } | null): string {
    if (!actor) {
      return 'Someone';
    }
    return actor.name?.trim() || actor.email;
  }
}
