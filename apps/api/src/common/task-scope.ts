import { WorkspaceRole } from '../generated/prisma/client.js';

export type TaskListWhere = {
  projectId: string;
  assigneeId?: string;
};

export function buildTaskListWhere(
  projectId: string,
  role: WorkspaceRole,
  userId: string,
): TaskListWhere {
  if (role === WorkspaceRole.MEMBER) {
    return { projectId, assigneeId: userId };
  }

  return { projectId };
}
