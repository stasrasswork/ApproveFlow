import { useMemo } from 'react';
import type { ClientOutsideProject, WorkspaceMember } from '../api/types';

export function useHandoffClientOptions(
  _workspaceMembers: WorkspaceMember[],
  clientsOutside: ClientOutsideProject[],
): ClientOutsideProject[] {
  return useMemo(() => {
    const merged = new Map<string, ClientOutsideProject>();
    for (const client of clientsOutside) {
      merged.set(client.userId, client);
    }

    return [...merged.values()].sort((left, right) =>
      (left.name ?? left.email).localeCompare(right.name ?? right.email),
    );
  }, [clientsOutside]);
}
