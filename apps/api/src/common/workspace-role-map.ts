import { WorkspaceRole } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

export async function loadWorkspaceRoleMap(
  prisma: PrismaService,
  workspaceId: string,
  userIds?: string[],
): Promise<Map<string, WorkspaceRole>> {
  const memberships = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      ...(userIds ? { userId: { in: userIds } } : {}),
    },
    select: { userId: true, role: true },
  });

  return new Map(
    memberships.map((membership) => [membership.userId, membership.role]),
  );
}
