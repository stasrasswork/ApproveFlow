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

export async function ensureWorkspaceClientsInProject(
  prisma: PrismaClient,
  projectId: string,
  workspaceId: string,
): Promise<string[]> {
  const outside = await listClientsOutsideProject(
    prisma,
    projectId,
    workspaceId,
  );

  if (outside.length === 0) {
    return [];
  }

  await prisma.projectMember.createMany({
    data: outside.map((client) => ({
      projectId,
      userId: client.userId,
    })),
    skipDuplicates: true,
  });

  return outside.map((client) => client.userId);
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
