import { WorkspaceRole } from '../generated/prisma/client.js';

export const AGENCY_ROLES: WorkspaceRole[] = [
  WorkspaceRole.ADMIN,
  WorkspaceRole.MANAGER,
];

export function isAgencyRole(role: WorkspaceRole): boolean {
  return AGENCY_ROLES.includes(role);
}
