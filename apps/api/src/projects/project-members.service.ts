import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectMember } from '../generated/prisma/client.js';
import {
  assertAgencyProjectAccess,
  rethrowUniqueAsConflict,
  userBriefSelect,
  type UserBrief,
} from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddProjectMemberDto } from './dto/index.js';

export type ProjectMemberWithUser = ProjectMember & {
  user: UserBrief;
};

@Injectable()
export class ProjectMembersService {
  constructor(private readonly prisma: PrismaService) {}

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
      return await this.prisma.projectMember.create({
        data: {
          projectId,
          userId: dto.userId,
        },
        include: { user: { select: userBriefSelect } },
      });
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
    await assertAgencyProjectAccess(this.prisma, projectId, userId);

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
  }
}
