import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi, tasksApi } from '../api/endpoints';
import type { TaskStatus } from '../api/types';
import { getApiErrorMessage } from '../lib/api-error';
import { queryKeys } from '../lib/query-keys';

export function useTaskMutations(
  taskId: string,
  projectId: string,
  onTransitionError: (message: string | null) => void,
) {
  const queryClient = useQueryClient();

  const invalidateTask = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.taskTransitions(taskId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projectStats(projectId) });
    queryClient.invalidateQueries({
      queryKey: queryKeys.projectActivity(projectId),
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.taskEvents(taskId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.comments(taskId) });
  };

  const transitionMutation = useMutation({
    mutationFn: ({
      to,
      comment,
      clientUserIds,
    }: {
      to: TaskStatus;
      comment?: string;
      clientUserIds?: string[];
    }) => tasksApi.transition(taskId, to, { comment, clientUserIds }),
    onSuccess: () => {
      onTransitionError(null);
      invalidateTask();
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationCount() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
    },
    onError: (err) => {
      onTransitionError(getApiErrorMessage(err, 'Failed to change status'));
    },
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => commentsApi.create(taskId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(taskId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectActivity(projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationCount() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
    },
    onError: (err) => {
      onTransitionError(getApiErrorMessage(err, 'Failed to post comment'));
    },
  });

  const updateDueMutation = useMutation({
    mutationFn: ({
      dueDate,
      reason,
    }: {
      dueDate: string | null;
      reason?: string;
    }) => tasksApi.updateDue(taskId, dueDate, reason),
    onSuccess: () => {
      onTransitionError(null);
      invalidateTask();
      queryClient.invalidateQueries({
        queryKey: queryKeys.taskDueChanges(taskId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectActivity(projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationCount() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
    },
    onError: (err) => {
      onTransitionError(getApiErrorMessage(err, 'Failed to update due date'));
    },
  });

  return {
    transitionMutation,
    commentMutation,
    updateDueMutation,
    invalidateTask,
  };
}
