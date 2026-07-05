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
};

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

  const role = await assertProjectAccess(prisma, task.project, userId);

  if (role === WorkspaceRole.MEMBER && task.assigneeId !== userId) {
    throw new ForbiddenException('No access to this task');
  }

  return {
    workspaceId: task.project.workspaceId,
    projectId: task.project.id,
  };
}
