import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectMember } from '../generated/prisma/client.js';
import {
  assertAgencyRole,
  isUniqueConstraintError,
  loadProjectAndAssertAccess,
} from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddProjectMemberDto } from './dto/index.js';

@Injectable()
export class ProjectMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember[]> {
    const project = await loadProjectAndAssertAccess(
      this.prisma,
      projectId,
      userId,
    );

    await assertAgencyRole(
      this.prisma,
      project.workspaceId,
      userId,
      'Only admin or manager can manage projects',
    );

    return this.prisma.projectMember.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async add(
    projectId: string,
    userId: string,
    dto: AddProjectMemberDto,
  ): Promise<ProjectMember> {
    const project = await loadProjectAndAssertAccess(
      this.prisma,
      projectId,
      userId,
    );

    await assertAgencyRole(
      this.prisma,
      project.workspaceId,
      userId,
      'Only admin or manager can manage projects',
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
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('User is already a member of this project');
      }
      throw error;
    }
  }

  async remove(
    projectId: string,
    userId: string,
    memberUserId: string,
  ): Promise<void> {
    const project = await loadProjectAndAssertAccess(
      this.prisma,
      projectId,
      userId,
    );

    await assertAgencyRole(
      this.prisma,
      project.workspaceId,
      userId,
      'Only admin or manager can manage projects',
    );

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
