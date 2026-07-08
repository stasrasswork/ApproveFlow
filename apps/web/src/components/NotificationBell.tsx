import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/endpoints';
import { useAuth } from '../auth/useAuth';
import { liveQueryOptions } from '../lib/constants';
import { formatDateTime } from '../lib/format';
import { queryKeys } from '../lib/query-keys';
import { Button } from './ui/Button';

/** Read notifications older than this are hidden from the dropdown. */
const READ_NOTIFICATION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isRelevantNotification(item: { read: boolean; createdAt: string }): boolean {
  if (!item.read) {
    return true;
  }
  const age = Date.now() - new Date(item.createdAt).getTime();
  return age <= READ_NOTIFICATION_MAX_AGE_MS;
}

function BellIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function NotificationBell() {
  const { activeWorkspace } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: count = 0 } = useQuery({
    queryKey: queryKeys.notificationCount(),
    queryFn: () => notificationsApi.unreadCount(),
    ...liveQueryOptions,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => notificationsApi.list(),
    enabled: open,
    ...liveQueryOptions,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationCount() });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationCount() });
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const visibleNotifications = notifications.filter(isRelevantNotification);

  return (
    <div ref={panelRef} className="relative">
      <Button
        type="button"
        variant="secondary"
        className="relative !px-0 w-11 min-w-11"
        aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <BellIcon className="h-5 w-5" />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {count > 9 ? '9+' : count}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 w-96 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-base font-semibold text-slate-800">Notifications</p>
            <div className="flex items-center gap-1">
              {count > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="!h-8 !px-2 text-xs"
                  onClick={() => markAllMutation.mutate()}
                  disabled={markAllMutation.isPending}
                >
                  Mark all read
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                className="!h-8 !w-8 !px-0"
                aria-label="Close notifications"
                onClick={() => setOpen(false)}
              >
                <CloseIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {visibleNotifications.length === 0 ? (
            <p className="text-sm text-slate-500">No notifications yet.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {visibleNotifications.map((item) => {
                const workspaceId = item.workspaceId ?? activeWorkspace?.id;
                const href =
                  workspaceId && item.projectId && item.taskId
                    ? `/w/${workspaceId}/projects/${item.projectId}/tasks/${item.taskId}`
                    : undefined;
                return (
                  <li
                    key={item.id}
                    className={`rounded-lg px-3 py-2.5 text-sm ${
                      item.read
                        ? 'bg-slate-50 text-slate-600'
                        : 'bg-brand-50 text-slate-800'
                    }`}
                  >
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 leading-relaxed">{item.body}</p>
                    <p className="mt-1.5 text-xs text-slate-400">
                      {formatDateTime(item.createdAt)}
                    </p>
                    <div className="mt-2 flex gap-3 text-sm">
                      {href ? (
                        <Link
                          to={href}
                          className="font-medium text-brand-600 hover:text-brand-700"
                          onClick={() => {
                            setOpen(false);
                            if (!item.read) {
                              markReadMutation.mutate(item.id);
                            }
                          }}
                        >
                          Open
                        </Link>
                      ) : null}
                      {!item.read ? (
                        <button
                          type="button"
                          className="font-medium text-slate-500 hover:text-slate-700"
                          onClick={() => markReadMutation.mutate(item.id)}
                        >
                          Mark read
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
