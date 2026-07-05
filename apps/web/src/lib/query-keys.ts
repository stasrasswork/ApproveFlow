export const queryKeys = {
  project: (projectId: string) => ['project', projectId] as const,
  projects: (workspaceId: string) => ['projects', workspaceId] as const,
  projectStats: (projectId: string) => ['project-stats', projectId] as const,
  projectActivity: (projectId: string) => ['project-activity', projectId] as const,
  projectMembers: (projectId: string) => ['project-members', projectId] as const,
  clientsOutside: (projectId: string) => ['clients-outside', projectId] as const,
  tasks: (projectId: string) => ['tasks', projectId] as const,
  task: (taskId: string) => ['task', taskId] as const,
  taskTransitions: (taskId: string) => ['task-transitions', taskId] as const,
  taskEvents: (taskId: string) => ['task-events', taskId] as const,
  taskDueChanges: (taskId: string) => ['task-due-changes', taskId] as const,
  comments: (taskId: string) => ['comments', taskId] as const,
  workspace: (workspaceId: string) => ['workspace', workspaceId] as const,
  workspaceMembers: (workspaceId: string) =>
    ['workspace-members', workspaceId] as const,
  notifications: () => ['notifications'] as const,
  notificationCount: () => ['notifications', 'unread-count'] as const,
};
