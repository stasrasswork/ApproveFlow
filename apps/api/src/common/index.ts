export { assertCanAccessTask, assertRoleCanAccessTask, type TaskAccessContext } from './task-access.js';
export { assertProjectExists, assertProjectAllowsTaskChanges } from './project-status.js';
export {
  assertAgencyProjectAccess,
  assertAssigneeInProject,
  assertProjectAccess,
  loadProjectAndAssertAccess,
  MANAGE_PROJECTS_FORBIDDEN,
} from './project-access.js';
export {
  ensureProjectClients,
  listClientsOutsideProject,
  listProjectClientUserIds,
  listProjectMemberUserIds,
  listWorkspaceMemberUserIds,
  type ClientOutsideProject,
} from './client-project-access.js';
export { normalizeEmail } from './normalize-email.js';
export {
  isUniqueConstraintError,
  rethrowUniqueAsConflict,
} from './prisma-errors.js';
export {
  SLUG_MAX_LENGTH,
  SLUG_PATTERN,
  SLUG_VALIDATION_MESSAGE,
  slugify,
} from '@approveflow/shared';
export { buildTaskListWhere, type TaskListWhere } from './task-scope.js';
export { userBriefSelect, type UserBrief } from './user-brief.js';
export { loadWorkspaceRoleMap } from './workspace-role-map.js';
export {
  assertAdminRole,
  assertAgencyRole,
  assertWorkspaceExists,
  getWorkspaceRole,
} from './workspace-access.js';
export { AGENCY_ROLES, isAgencyRole } from './workspace-roles.js';
