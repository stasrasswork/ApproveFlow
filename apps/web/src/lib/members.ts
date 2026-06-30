import type { WorkspaceMember } from '../api/types';

const ASSIGNABLE_ROLES = new Set<WorkspaceMember['role']>([
  'ADMIN',
  'MANAGER',
  'MEMBER',
]);

export function filterAssignableMembers(
  members: WorkspaceMember[],
): WorkspaceMember[] {
  return members.filter((member) => ASSIGNABLE_ROLES.has(member.role));
}

export function assigneeNeedsProjectAccess(
  assigneeId: string | null | undefined,
  projectMemberUserIds: Set<string>,
): boolean {
  return Boolean(assigneeId) && !projectMemberUserIds.has(assigneeId!);
}
