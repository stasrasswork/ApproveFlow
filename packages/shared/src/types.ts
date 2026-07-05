export type TaskStatus =
  | 'BRIEF'
  | 'PRODUCTION'
  | 'INTERNAL_REVIEW'
  | 'CLIENT_HANDOFF'
  | 'CLIENT_APPROVAL'
  | 'PENDING_CLOSURE'
  | 'DONE';

export type WorkspaceRole = 'ADMIN' | 'MANAGER' | 'MEMBER' | 'CLIENT_VIEW';

export type NotificationType =
  | 'TASK_CLIENT_HANDOFF'
  | 'TASK_UPDATE'
  | 'WORKSPACE_INVITE';

export type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';
