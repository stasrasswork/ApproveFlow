export const ACTIVITY_PAGE_SIZE = 20;
/** List and project pages — lower polling pressure under load. */
export const LIVE_REFETCH_MS = 8_000;
/** Task detail pages — fresher status/comments for active work. */
export const TASK_LIVE_REFETCH_MS = 3_000;
export const NOTIFICATIONS_OPEN_REFETCH_MS = 3_000;

const liveBase = {
  refetchIntervalInBackground: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

/** Shared React Query options for list/project pages. */
export const listLiveQueryOptions = {
  ...liveBase,
  refetchInterval: LIVE_REFETCH_MS,
} as const;

/** Higher-frequency polling for an open task detail page. */
export const taskLiveQueryOptions = {
  ...liveBase,
  refetchInterval: TASK_LIVE_REFETCH_MS,
} as const;
