import {
  BadRequestException,
} from '@nestjs/common';
import { WorkspaceRole } from '../generated/prisma/client.js';
import { userBriefSelect, type UserBrief } from './user-brief.js';
import type { PrismaService } from '../prisma/prisma.service.js';

type PrismaClient = Pick<
  PrismaService,
  'workspaceMember' | 'projectMember'
>;

export type ClientOutsideProject = UserBrief & { userId: string };

export async function listClientsOutsideProject(
  prisma: PrismaClient,
  projectId: string,
  workspaceId: string,
): Promise<ClientOutsideProject[]> {
  const [clients, projectMembers] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId, role: WorkspaceRole.CLIENT_VIEW },
      include: { user: { select: userBriefSelect } },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    }),
  ]);

  const inProject = new Set(projectMembers.map((member) => member.userId));

  return clients
    .filter((member) => !inProject.has(member.userId))
    .map((member) => ({
      userId: member.userId,
      ...member.user,
    }));
}

export async function ensureProjectClients(
  prisma: PrismaClient,
  projectId: string,
  workspaceId: string,
  clientUserIds: string[],
): Promise<void> {
  const uniqueClientIds = [...new Set(clientUserIds)];
  if (uniqueClientIds.length === 0) {
    return;
  }

  const workspaceClients = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      role: WorkspaceRole.CLIENT_VIEW,
      userId: { in: uniqueClientIds },
    },
    select: { userId: true },
  });

  const available = new Set(workspaceClients.map((member) => member.userId));
  const invalid = uniqueClientIds.filter((id) => !available.has(id));
  if (invalid.length > 0) {
    throw new BadRequestException(
      `Users are not client members of this workspace: ${invalid.join(', ')}`,
    );
  }

  await prisma.projectMember.createMany({
    data: uniqueClientIds.map((userId) => ({ projectId, userId })),
    skipDuplicates: true,
  });
}

export async function listProjectClientUserIds(
  prisma: PrismaClient,
  projectId: string,
  workspaceId: string,
): Promise<string[]> {
  const clients = await prisma.workspaceMember.findMany({
    where: { workspaceId, role: WorkspaceRole.CLIENT_VIEW },
    select: { userId: true },
  });

  if (clients.length === 0) {
    return [];
  }

  const clientIds = clients.map((client) => client.userId);
  const projectMembers = await prisma.projectMember.findMany({
    where: { projectId, userId: { in: clientIds } },
    select: { userId: true },
  });

  return projectMembers.map((member) => member.userId);
}

export async function listProjectMemberUserIds(
  prisma: Pick<PrismaService, 'projectMember'>,
  projectId: string,
  excludeUserId?: string,
): Promise<string[]> {
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  });

  return members
    .map((member) => member.userId)
    .filter((userId) => userId !== excludeUserId);
}

export async function listWorkspaceMemberUserIds(
  prisma: Pick<PrismaService, 'workspaceMember'>,
  workspaceId: string,
  options?: {
    excludeUserIds?: string[];
    includeRoles?: WorkspaceRole[];
  },
): Promise<string[]> {
  const excluded = new Set(options?.excludeUserIds ?? []);
  const members = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      ...(options?.includeRoles && options.includeRoles.length > 0
        ? { role: { in: options.includeRoles } }
        : {}),
    },
    select: { userId: true },
  });

  return [...new Set(members.map((member) => member.userId))].filter(
    (userId) => !excluded.has(userId),
  );
}
