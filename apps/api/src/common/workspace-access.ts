import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkspaceRole } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { isAgencyRole } from './workspace-roles.js';

export async function assertWorkspaceExists(
  prisma: PrismaService,
  workspaceId: string,
): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });

  if (!workspace) {
    throw new NotFoundException(`Workspace ${workspaceId} not found`);
  }
}

export async function getWorkspaceRole(
  prisma: PrismaService,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRole> {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  });

  if (!membership) {
    throw new ForbiddenException('Not a member of this workspace');
  }

  return membership.role;
}

export async function assertAgencyRole(
  prisma: PrismaService,
  workspaceId: string,
  userId: string,
  message: string,
): Promise<WorkspaceRole> {
  const role = await getWorkspaceRole(prisma, workspaceId, userId);

  if (!isAgencyRole(role)) {
    throw new ForbiddenException(message);
  }

  return role;
}
