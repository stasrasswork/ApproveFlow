import type { ProjectStatus } from '../../api/types';
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS } from '../../lib/project-status';

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${PROJECT_STATUS_COLORS[status]}`}
    >
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}
