import { TASK_STATUS_LABELS } from '@approveflow/shared';
import type { TaskStatus } from '../api/types';

export { TASK_STATUS_LABELS as STATUS_LABELS };

/** Simplified marketing / onboarding flow (omits handoff and pending closure). */
export const WORKFLOW_STEPS = [
  { status: 'BRIEF', label: 'Brief' },
  { status: 'PRODUCTION', label: 'Production' },
  { status: 'INTERNAL_REVIEW', label: 'Review' },
  { status: 'CLIENT_APPROVAL', label: 'Client approval' },
  { status: 'DONE', label: 'Done' },
] as const satisfies ReadonlyArray<{ status: TaskStatus; label: string }>;

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

export type TransitionButtonVariant = 'primary' | 'danger' | 'secondary';
