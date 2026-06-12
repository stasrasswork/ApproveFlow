import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Workspace,
  WorkspaceRole,
} from '../generated/prisma/client.js';
import { isUniqueConstraintError, slugify } from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto/index.js';

export type WorkspaceWithRole = Workspace & {
  role: WorkspaceRole;
};

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<WorkspaceWithRole[]> {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { workspace: { createdAt: 'desc' } },
    });

    return memberships.map((membership) => ({
      ...membership.workspace,
      role: membership.role,
    }));
  }

  async findOne(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceWithRole> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
      include: { workspace: true },
    });

    if (!membership) {
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true },
      });

      if (!workspace) {
        throw new NotFoundException(`Workspace ${workspaceId} not found`);
      }

      throw new ForbiddenException('Not a member of this workspace');
    }

    return {
      ...membership.workspace,
      role: membership.role,
    };
  }

  async create(
    userId: string,
    dto: CreateWorkspaceDto,
  ): Promise<Workspace> {
    const slug = dto.slug ?? slugify(dto.name);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const workspace = await tx.workspace.create({
          data: { name: dto.name, slug },
        });

        await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId,
            role: WorkspaceRole.ADMIN,
          },
        });

        return workspace;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Workspace slug already exists');
      }
      throw error;
    }
  }

  async update(
    workspaceId: string,
    userId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    if (membership.role !== WorkspaceRole.ADMIN) {
      throw new ForbiddenException('Only admin can update workspace');
    }

    try {
      return await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: dto,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Workspace slug already exists');
      }
      throw error;
    }
  }

  async delete(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    if (membership.role !== WorkspaceRole.ADMIN) {
      throw new ForbiddenException('Only admin can delete workspace');
    }

    await this.prisma.workspace.delete({
      where: { id: workspaceId },
    });
  }
}
