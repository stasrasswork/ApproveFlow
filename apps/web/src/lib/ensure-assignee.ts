import { projectsApi } from '../api/endpoints';

export async function ensureAssigneeInProject(
  projectId: string,
  assigneeId: string | null | undefined,
  projectMemberUserIds: Set<string>,
): Promise<void> {
  if (!assigneeId || projectMemberUserIds.has(assigneeId)) {
    return;
  }

  await projectsApi.members.add(projectId, assigneeId);
}
