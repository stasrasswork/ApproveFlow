import type { WorkspaceRole } from './types.js';

export const AGENCY_ROLES: WorkspaceRole[] = ['ADMIN', 'MANAGER'];

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  MEMBER: 'Member',
  CLIENT_VIEW: 'Client',
};

export function isAgencyRole(role: WorkspaceRole): boolean {
  return AGENCY_ROLES.includes(role);
}
