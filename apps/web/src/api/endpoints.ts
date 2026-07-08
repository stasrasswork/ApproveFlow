import { apiFetch } from './client';
import type {
  AllowedTransitions,
  AuthTokens,
  ClientOutsideProject,
  Comment,
  InviteWorkspaceResult,
  MeResult,
  Notification,
  Project,
  ProjectActivityPage,
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

  register: (email: string, password: string, name?: string, inviteToken?: string) =>
    apiFetch<{ id: string; email: string; name: string | null; message: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, name, inviteToken }),
      },
    ),

  me: () => apiFetch<MeResult>('/auth/me'),

  updateProfile: (name: string) =>
    apiFetch<MeResult>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  forgotPassword: (email: string) =>
    apiFetch<{ message: string; resetToken?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    apiFetch<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  logout: () =>
    apiFetch<void>('/auth/logout', {
      method: 'POST',
    }),
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
    },
  ) =>
    apiFetch<TaskView>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  allowedTransitions: (id: string) =>
    apiFetch<AllowedTransitions>(`/tasks/${id}/allowed-transitions`),

  transition: (
    id: string,
    to: TaskStatus,
    options?: { comment?: string; clientUserIds?: string[] },
  ) =>
    apiFetch<TaskView>(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        to,
        comment: options?.comment,
        clientUserIds: options?.clientUserIds,
      }),
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

export const notificationsApi = {
  list: () => apiFetch<Notification[]>('/notifications'),

  unreadCount: () =>
    apiFetch<{ count: number }>('/notifications/unread-count').then(
      (result) => result.count,
    ),

  markRead: (id: string) =>
    apiFetch<void>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    apiFetch<void>('/notifications/read-all', { method: 'PATCH' }),
};
