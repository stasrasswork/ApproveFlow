import type { MeResult, WorkspaceRole } from '../api/types';

export function roleForWorkspace(
  user: MeResult | null,
  workspaceId: string,
): WorkspaceRole | null {
  if (!user || !workspaceId) {
    return null;
  }

  return user.workspaces.find((workspace) => workspace.id === workspaceId)?.role ?? null;
}
