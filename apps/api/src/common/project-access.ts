import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { getWorkspaceRole } from './workspace-access.js';

export type ProjectScope = {
  id: string;
  workspaceId: string;
};

export async function assertProjectMember(
  prisma: PrismaService,
  projectId: string,
  userId: string,
): Promise<void> {
  const projectMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
  });

  if (!projectMember) {
    throw new ForbiddenException('No access to this project');
  }
}

export async function assertProjectAccess(
  prisma: PrismaService,
  project: ProjectScope,
  userId: string,
): Promise<WorkspaceRole> {
  const role = await getWorkspaceRole(prisma, project.workspaceId, userId);

  if (
    role === WorkspaceRole.CLIENT_VIEW ||
    role === WorkspaceRole.MEMBER
  ) {
    await assertProjectMember(prisma, project.id, userId);
  }

  return role;
}

export type ProjectWithAccess = ProjectScope & { role: WorkspaceRole };

export async function loadProjectAndAssertAccess(
  prisma: PrismaService,
  projectId: string,
  userId: string,
): Promise<ProjectWithAccess> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true },
  });

  if (!project) {
    throw new NotFoundException(`Project ${projectId} not found`);
  }

  const role = await assertProjectAccess(prisma, project, userId);
  return { ...project, role };
}

export async function assertAssigneeInProject(
  prisma: PrismaService,
  assigneeId: string,
  projectId: string,
  workspaceId: string,
): Promise<void> {
  const assignee = await prisma.user.findUnique({
    where: { id: assigneeId },
    select: { id: true },
  });

  if (!assignee) {
    throw new BadRequestException('Assignee not found');
  }

  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId: assigneeId },
    },
  });

  if (!workspaceMember) {
    throw new BadRequestException('Assignee is not a member of this workspace');
  }

  if (workspaceMember.role === WorkspaceRole.CLIENT_VIEW) {
    throw new BadRequestException('Client cannot be assigned as task executor');
  }

  const projectMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId: assigneeId },
    },
  });

  if (!projectMember) {
    throw new BadRequestException('Assignee is not a member of this project');
  }
}
