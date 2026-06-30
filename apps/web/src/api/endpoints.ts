import { apiFetch } from './client';
import type {
  AllowedTransitions,
  AuthTokens,
  Comment,
  MeResult,
  Project,
  ProjectActivityItem,
  ProjectMember,
  ProjectStats,
  ProjectStatus,
  TaskDueChange,
  TaskEvent,
  TaskStatus,
  TaskView,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceWithRole,
} from './types';

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name?: string) =>
    apiFetch<{ id: string; email: string; name: string | null; message: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      },
    ),

  me: () => apiFetch<MeResult>('/auth/me'),
};

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

  members: {
    list: (workspaceId: string) =>
      apiFetch<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),

    invite: (workspaceId: string, email: string, role: WorkspaceRole) =>
      apiFetch<WorkspaceMember>(`/workspaces/${workspaceId}/members`, {
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

  activity: (id: string) =>
    apiFetch<ProjectActivityItem[]>(`/projects/${id}/activity`),

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

export const tasksApi = {
  list: (projectId: string) =>
    apiFetch<TaskView[]>(`/projects/${projectId}/tasks`),

  create: (
    projectId: string,
    data: {
      title: string;
      description?: string;
      assigneeId?: string;
      dueAt?: string;
      sprintLabel?: string;
    },
  ) =>
    apiFetch<TaskView>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (id: string) => apiFetch<TaskView>(`/tasks/${id}`),

  update: (
    id: string,
    data: {
      title?: string;
      description?: string;
      assigneeId?: string | null;
      sprintLabel?: string;
    },
  ) =>
    apiFetch<TaskView>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  allowedTransitions: (id: string) =>
    apiFetch<AllowedTransitions>(`/tasks/${id}/allowed-transitions`),

  transition: (id: string, to: TaskStatus, comment?: string) =>
    apiFetch<TaskView>(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ to, comment }),
    }),

  updateDue: (id: string, dueAt: string | null, reason?: string) =>
    apiFetch<TaskView>(`/tasks/${id}/due`, {
      method: 'PATCH',
      body: JSON.stringify({ dueAt, reason }),
    }),

  events: (id: string) => apiFetch<TaskEvent[]>(`/tasks/${id}/events`),

  dueChanges: (id: string) =>
    apiFetch<TaskDueChange[]>(`/tasks/${id}/due-changes`),
};

export const commentsApi = {
  list: (taskId: string) =>
    apiFetch<Comment[]>(`/tasks/${taskId}/comments`),

  create: (taskId: string, body: string) =>
    apiFetch<Comment>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
};
