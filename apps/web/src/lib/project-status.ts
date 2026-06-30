import type { ProjectStatus } from '../api/types';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  PAUSED: 'bg-amber-50 text-amber-900 ring-amber-100',
  COMPLETED: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function isProjectOperational(status: ProjectStatus): boolean {
  return status !== 'COMPLETED';
}
