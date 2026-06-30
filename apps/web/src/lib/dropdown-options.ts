import type { UserBrief, WorkspaceRole } from '../api/types';
import { userDisplayName } from './format';
import { ROLE_LABELS } from './roles';

const ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
  ADMIN: 'Full workspace access',
  MANAGER: 'Manage projects and workflow',
  MEMBER: 'Work on assigned tasks',
  CLIENT_VIEW: 'Review and approve deliverables',
};

export function roleDropdownOptions(
  roles: WorkspaceRole[] = ['ADMIN', 'MANAGER', 'MEMBER', 'CLIENT_VIEW'],
): { value: string; label: string; description: string }[] {
  return roles.map((role) => ({
    value: role,
    label: ROLE_LABELS[role],
    description: ROLE_DESCRIPTIONS[role],
  }));
}

export function workspaceMemberDropdownOptions(
  members: { user: UserBrief; role: WorkspaceRole }[],
  options?: { includeEmpty?: boolean; emptyLabel?: string },
): { value: string; label: string; description?: string }[] {
  const items = members.map(({ user, role }) => ({
    value: user.id,
    label: userDisplayName(user),
    description: `${ROLE_LABELS[role]} · ${user.email}`,
  }));

  if (options?.includeEmpty) {
    return [
      { value: '', label: options.emptyLabel ?? 'Unassigned' },
      ...items,
    ];
  }

  return items;
}
