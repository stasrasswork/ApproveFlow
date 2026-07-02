export const ACTIVITY_PAGE_SIZE = 20;
export const LIVE_REFETCH_MS = 15_000;

/** Shared React Query options for data that should stay fresh across collaborators. */
export const liveQueryOptions = {
  refetchInterval: LIVE_REFETCH_MS,
  refetchIntervalInBackground: true,
} as const;
