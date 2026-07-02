import type { WorkspaceRole } from '../api/types';

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  MEMBER: 'Member',
  CLIENT_VIEW: 'Client',
};

export function isAgencyRole(role: WorkspaceRole): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

export function canChangeMemberRoles(role: WorkspaceRole): boolean {
  return role === 'ADMIN';
}

export function canRemoveMembers(role: WorkspaceRole): boolean {
  return role === 'ADMIN';
}

export function canUpdateWorkspace(role: WorkspaceRole): boolean {
  return role === 'ADMIN';
}

export function canDeleteWorkspace(role: WorkspaceRole): boolean {
  return role === 'ADMIN';
}
