import type { PrismaService } from '../../src/prisma/prisma.service.js';

export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.workspaceInvite.deleteMany(),
    prisma.taskEvent.deleteMany(),
    prisma.taskDueChange.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.task.deleteMany(),
    prisma.projectMember.deleteMany(),
    prisma.project.deleteMany(),
    prisma.workspaceMember.deleteMany(),
    prisma.workspace.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
