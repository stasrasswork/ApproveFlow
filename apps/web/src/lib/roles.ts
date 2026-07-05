import {
  AGENCY_ROLES,
  isAgencyRole,
  ROLE_LABELS,
} from '@approveflow/shared';
import type { WorkspaceRole } from '../api/types';

export { AGENCY_ROLES, isAgencyRole, ROLE_LABELS };

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
