import { apiFetch } from '../client';
import type {
  AllowedTransitions,
  TaskDueChange,
  TaskEvent,
  TaskStatus,
  TaskView,
} from '../types';

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
