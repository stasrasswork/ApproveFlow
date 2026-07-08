import { Link } from 'react-router-dom';
import type { ProjectActivityItem } from '../api/types';
import { AuthorLine } from './ui/RoleBadge';
import { formatDate, formatDateTime } from '../lib/format';
import { getEventTypeLabel } from '../lib/task-events';
import { STATUS_LABELS } from '../lib/task-status';

type ProjectActivityItemProps = {
  item: ProjectActivityItem;
  workspaceId: string;
  projectId: string;
};

export function ProjectActivityItem({
  item,
  workspaceId,
  projectId,
}: ProjectActivityItemProps) {
  const taskLink = `/w/${workspaceId}/projects/${projectId}/tasks/${item.taskId}`;

  const dotColor =
    item.type === 'status_changed'
      ? 'bg-brand-500'
      : item.type === 'comment'
        ? 'bg-violet-500'
        : 'bg-amber-500';

  if (item.type === 'status_changed') {
    const eventLabel = getEventTypeLabel(item.eventType, item.approvalType);
    return (
      <li className="flex gap-3 border-b border-slate-100 py-3 last:border-0">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
        <div className="min-w-0">
          {item.actorRole ? (
            <AuthorLine
              author={item.actor}
              role={item.actorRole}
              timestamp={formatDateTime(item.occurredAt)}
            />
          ) : (
            <p className="text-xs text-slate-500">{formatDateTime(item.occurredAt)}</p>
          )}
          <p className="mt-1 break-words text-sm text-slate-700">
            changed status on{' '}
            <Link to={taskLink} className="font-medium text-brand-600 hover:underline">
              {item.taskTitle}
            </Link>
          </p>
          <p className="mt-1 break-words text-xs text-slate-500">
            {STATUS_LABELS[item.fromStatus]} → {STATUS_LABELS[item.toStatus]}
            {eventLabel ? ` · ${eventLabel}` : ''}
          </p>
          {item.comment ? (
            <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {item.comment}
            </p>
          ) : null}
        </div>
      </li>
    );
  }

  if (item.type === 'comment') {
    return (
      <li className="flex gap-3 border-b border-slate-100 py-3 last:border-0">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
        <div className="min-w-0">
          {item.authorRole ? (
            <AuthorLine
              author={item.author}
              role={item.authorRole}
              timestamp={formatDateTime(item.occurredAt)}
            />
          ) : (
            <p className="text-xs text-slate-500">{formatDateTime(item.occurredAt)}</p>
          )}
          <p className="mt-1 break-words text-sm text-slate-700">
            commented on{' '}
            <Link to={taskLink} className="font-medium text-brand-600 hover:underline">
              {item.taskTitle}
            </Link>
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">
            {item.body}
          </p>
        </div>
      </li>
    );
  }

  return (
    <li className="flex gap-3 border-b border-slate-100 py-3 last:border-0">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
      <div className="min-w-0">
        {item.changedByRole ? (
          <AuthorLine
            author={item.changedBy}
            role={item.changedByRole}
            timestamp={formatDateTime(item.occurredAt)}
          />
        ) : (
          <p className="text-xs text-slate-500">{formatDateTime(item.occurredAt)}</p>
        )}
        <p className="mt-1 break-words text-sm text-slate-700">
          updated due date on{' '}
          <Link to={taskLink} className="font-medium text-brand-600 hover:underline">
            {item.taskTitle}
          </Link>
        </p>
        <p className="mt-1 break-words text-xs text-slate-500">
          {formatDate(item.oldDueAt)} → {formatDate(item.newDueAt)}
          {item.reason ? ` · ${item.reason}` : ''}
        </p>
      </div>
    </li>
  );
}
