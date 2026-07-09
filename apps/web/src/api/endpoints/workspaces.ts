import { apiFetch } from '../client';
import type {
  InviteWorkspaceResult,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceWithRole,
} from '../types';

export const workspacesApi = {
  create: (name: string, slug?: string) =>
    apiFetch<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    }),

  get: (id: string) => apiFetch<WorkspaceWithRole>(`/workspaces/${id}`),

  update: (id: string, data: { name?: string; slug?: string }) =>
    apiFetch<WorkspaceWithRole>(`/workspaces/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/workspaces/${id}`, { method: 'DELETE' }),

  members: {
    list: (workspaceId: string) =>
      apiFetch<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),

    invite: (workspaceId: string, email: string, role: WorkspaceRole) =>
      apiFetch<InviteWorkspaceResult>(`/workspaces/${workspaceId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      }),

    updateRole: (
      workspaceId: string,
      userId: string,
      role: WorkspaceRole,
    ) =>
      apiFetch<WorkspaceMember>(
        `/workspaces/${workspaceId}/members/${userId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ role }),
        },
      ),

    remove: (workspaceId: string, userId: string) =>
      apiFetch<void>(`/workspaces/${workspaceId}/members/${userId}`, {
        method: 'DELETE',
      }),
  },
};
