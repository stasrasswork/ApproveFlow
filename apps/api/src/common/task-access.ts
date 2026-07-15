import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { assertProjectAccess } from './project-access.js';

export type TaskAccessContext = {
  workspaceId: string;
  projectId: string;
  role: WorkspaceRole;
};

/** Shared MEMBER/assignee rule for an already-loaded task + project. */
export async function assertRoleCanAccessTask(
  prisma: PrismaService,
  project: { id: string; workspaceId: string },
  assigneeId: string | null,
  userId: string,
): Promise<WorkspaceRole> {
  const role = await assertProjectAccess(prisma, project, userId);

  if (role === WorkspaceRole.MEMBER && assigneeId !== userId) {
    throw new ForbiddenException('No access to this task');
  }

  return role;
}

export async function assertCanAccessTask(
  prisma: PrismaService,
  taskId: string,
  userId: string,
): Promise<TaskAccessContext> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      assigneeId: true,
      project: { select: { id: true, workspaceId: true } },
    },
  });

  if (!task) {
    throw new NotFoundException(`Task ${taskId} not found`);
  }

  const role = await assertRoleCanAccessTask(
    prisma,
    task.project,
    task.assigneeId,
    userId,
  );

  return {
    workspaceId: task.project.workspaceId,
    projectId: task.project.id,
    role,
  };
}
