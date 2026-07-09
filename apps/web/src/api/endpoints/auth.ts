import { apiFetch } from '../client';
import type { AuthTokens, MeResult } from '../types';

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
