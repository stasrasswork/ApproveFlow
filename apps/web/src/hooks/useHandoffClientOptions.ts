import { useMemo } from 'react';
import type { ClientOutsideProject, WorkspaceMember } from '../api/types';

export function useHandoffClientOptions(
  workspaceMembers: WorkspaceMember[],
  clientsOutside: ClientOutsideProject[],
): ClientOutsideProject[] {
  return useMemo(() => {
    const inProjectClients = workspaceMembers
      .filter((member) => member.role === 'CLIENT_VIEW')
      .map((member) => ({
        userId: member.userId,
        id: member.user.id,
        email: member.user.email,
        name: member.user.name,
      }));

    const merged = new Map<string, ClientOutsideProject>();
    for (const client of [...clientsOutside, ...inProjectClients]) {
      merged.set(client.userId, client);
    }

    return [...merged.values()].sort((left, right) =>
      (left.name ?? left.email).localeCompare(right.name ?? right.email),
    );
  }, [workspaceMembers, clientsOutside]);
}
