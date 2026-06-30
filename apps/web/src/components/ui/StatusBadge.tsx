import type { TaskStatus } from '../../api/types';
import { STATUS_COLORS, STATUS_LABELS } from '../../lib/task-status';

export function StatusBadge({
  status,
  size = 'sm',
}: {
  status: TaskStatus;
  size?: 'sm' | 'md';
}) {
  const sizeClass =
    size === 'md'
      ? 'inline-flex h-11 items-center rounded-xl px-3.5 text-sm font-semibold'
      : 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';

  return (
    <span className={`${sizeClass} ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
