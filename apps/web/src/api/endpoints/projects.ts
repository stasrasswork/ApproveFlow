import { apiFetch } from '../client';
import type {
  ClientOutsideProject,
  Project,
  ProjectActivityPage,
  ProjectMember,
  ProjectStats,
  ProjectStatus,
} from '../types';

export const projectsApi = {
  list: (workspaceId: string) =>
    apiFetch<Project[]>(`/workspaces/${workspaceId}/projects`),

  create: (workspaceId: string, name: string, description?: string) =>
    apiFetch<Project>(`/workspaces/${workspaceId}/projects`, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  get: (id: string) => apiFetch<Project>(`/projects/${id}`),

  update: (id: string, data: { name?: string; description?: string; status?: ProjectStatus }) =>
    apiFetch<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/projects/${id}`, { method: 'DELETE' }),

  stats: (id: string) => apiFetch<ProjectStats>(`/projects/${id}/stats`),

  activity: (id: string, params?: { limit?: number; cursor?: string }) => {
    const search = new URLSearchParams();
    if (params?.limit) {
      search.set('limit', String(params.limit));
    }
    if (params?.cursor) {
      search.set('cursor', params.cursor);
    }
    const query = search.toString();
    return apiFetch<ProjectActivityPage>(
      `/projects/${id}/activity${query ? `?${query}` : ''}`,
    );
  },

  clientsOutside: (id: string) =>
    apiFetch<ClientOutsideProject[]>(`/projects/${id}/clients-outside`),

  members: {
    list: (projectId: string) =>
      apiFetch<ProjectMember[]>(`/projects/${projectId}/members`),

    add: (projectId: string, userId: string) =>
      apiFetch<ProjectMember>(`/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),

    remove: (projectId: string, userId: string) =>
      apiFetch<void>(`/projects/${projectId}/members/${userId}`, {
        method: 'DELETE',
      }),
  },
};
