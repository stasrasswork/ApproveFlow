import type { TaskStatus, WorkspaceRole } from '../api/types';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  BRIEF: 'Brief',
  PRODUCTION: 'In progress',
  INTERNAL_REVIEW: 'Internal review',
  CLIENT_HANDOFF: 'Awaiting client',
  CLIENT_APPROVAL: 'Client approval',
  PENDING_CLOSURE: 'Pending closure',
  DONE: 'Done',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  BRIEF: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  PRODUCTION: 'bg-blue-50 text-blue-800 ring-1 ring-blue-200',
  INTERNAL_REVIEW: 'bg-violet-50 text-violet-800 ring-1 ring-violet-200',
  CLIENT_HANDOFF: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200',
  CLIENT_APPROVAL: 'bg-orange-50 text-orange-900 ring-1 ring-orange-200',
  PENDING_CLOSURE: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200',
  DONE: 'bg-green-50 text-green-800 ring-1 ring-green-200',
};

export function getBlockingHint(status: TaskStatus): string | null {
  switch (status) {
    case 'CLIENT_HANDOFF':
      return 'Waiting for client action';
    case 'CLIENT_APPROVAL':
      return 'Waiting for client decision';
    case 'PENDING_CLOSURE':
      return 'Waiting for manager confirmation';
    case 'INTERNAL_REVIEW':
      return 'Waiting for manager decision';
    case 'DONE':
      return null;
    default:
      return null;
  }
}

const TRANSITION_LABELS: Partial<
  Record<TaskStatus, Partial<Record<TaskStatus, string>>>
> = {
  BRIEF: { PRODUCTION: 'Start work' },
  PRODUCTION: { INTERNAL_REVIEW: 'Send to internal review' },
  INTERNAL_REVIEW: {
    PRODUCTION: 'Request revisions',
    CLIENT_HANDOFF: 'Send to client',
  },
  CLIENT_HANDOFF: {
    INTERNAL_REVIEW: 'Recall',
    CLIENT_APPROVAL: 'Accept for review',
  },
  CLIENT_APPROVAL: {
    PENDING_CLOSURE: 'Approve',
    PRODUCTION: 'Request changes',
  },
  PENDING_CLOSURE: { DONE: 'Confirm closure' },
};

export function getTransitionLabel(from: TaskStatus, to: TaskStatus): string {
  return TRANSITION_LABELS[from]?.[to] ?? `${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}`;
}

export function transitionNeedsComment(
  from: TaskStatus,
  to: TaskStatus,
  role: WorkspaceRole,
): boolean {
  return (
    role === 'CLIENT_VIEW' &&
    from === 'CLIENT_APPROVAL' &&
    to === 'PRODUCTION'
  );
}

export function transitionButtonVariant(
  from: TaskStatus,
  to: TaskStatus,
): 'primary' | 'danger' | 'secondary' {
  if (from === 'CLIENT_APPROVAL' && to === 'PRODUCTION') {
    return 'danger';
  }
  if (to === 'DONE' || to === 'PENDING_CLOSURE') {
    return 'primary';
  }
  return 'secondary';
}
