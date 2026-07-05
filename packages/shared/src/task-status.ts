import type { TaskStatus } from './types.js';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  BRIEF: 'Brief',
  PRODUCTION: 'In progress',
  INTERNAL_REVIEW: 'Internal review',
  CLIENT_HANDOFF: 'Awaiting client',
  CLIENT_APPROVAL: 'Client approval',
  PENDING_CLOSURE: 'Pending closure',
  DONE: 'Done',
};

export function formatTaskStatus(status: TaskStatus): string {
  return TASK_STATUS_LABELS[status];
}
