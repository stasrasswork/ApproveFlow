import { apiFetch } from '../client';
import type { Comment } from '../types';

export const commentsApi = {
  list: (taskId: string) =>
    apiFetch<Comment[]>(`/tasks/${taskId}/comments`),

  create: (taskId: string, body: string) =>
    apiFetch<Comment>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
};
