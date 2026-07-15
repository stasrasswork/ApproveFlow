import { type FormEvent, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commentsApi, projectsApi, tasksApi, workspacesApi } from '../../api/endpoints';
import type { AllowedTransitions } from '../../api/types';
import { useAuth } from '../../auth/useAuth';
import { useHandoffClientOptions } from '../../hooks/useHandoffClientOptions';
import { useTaskMutations } from '../../hooks/useTaskMutations';
import { getApiErrorMessage } from '../../lib/api-error';
import { taskLiveQueryOptions } from '../../lib/constants';
import { workspaceMemberDropdownOptions } from '../../lib/dropdown-options';
import { ensureAssigneeInProject } from '../../lib/ensure-assignee';
import { dateInputToIso, toDateInputValue } from '../../lib/format';
import { assigneeNeedsProjectAccess, filterAssignableMembers } from '../../lib/members';
import { queryKeys } from '../../lib/query-keys';
import { isAgencyRole } from '../../lib/roles';
import { roleForWorkspace } from '../../lib/route-workspace-role';
import { getBlockingHint } from '../../lib/task-status';

export function useTaskPageModel() {
  const { workspaceId = '', projectId = '', taskId = '' } = useParams();
  const { user } = useAuth();
  const role = roleForWorkspace(user, workspaceId);
  const queryClient = useQueryClient();

  const [commentBody, setCommentBody] = useState('');
  const [newComment, setNewComment] = useState('');
  const [selectedHandoffClientIds, setSelectedHandoffClientIds] = useState<string[]>([]);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [pendingTransition, setPendingTransition] = useState<
    AllowedTransitions['targets'][number] | null
  >(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueReason, setEditDueReason] = useState('');
  const [showDueDateForm, setShowDueDateForm] = useState(false);
  const [quickDueDate, setQuickDueDate] = useState('');
  const [quickDueReason, setQuickDueReason] = useState('');

  const { data: task, isLoading: taskLoading, isError: taskError } = useQuery({
    queryKey: queryKeys.task(taskId),
    queryFn: () => tasksApi.get(taskId),
    enabled: Boolean(taskId),
    ...taskLiveQueryOptions,
  });

  const { data: transitions } = useQuery({
    queryKey: queryKeys.taskTransitions(taskId),
    queryFn: () => tasksApi.allowedTransitions(taskId),
    enabled: Boolean(taskId),
    ...taskLiveQueryOptions,
  });

  const { data: comments = [] } = useQuery({
    queryKey: queryKeys.comments(taskId),
    queryFn: () => commentsApi.list(taskId),
    enabled: Boolean(taskId),
    ...taskLiveQueryOptions,
  });

  const { data: events = [] } = useQuery({
    queryKey: queryKeys.taskEvents(taskId),
    queryFn: () => tasksApi.events(taskId),
    enabled: Boolean(taskId),
    ...taskLiveQueryOptions,
  });

  const { data: dueChanges = [] } = useQuery({
    queryKey: queryKeys.taskDueChanges(taskId),
    queryFn: () => tasksApi.dueChanges(taskId),
    enabled: Boolean(taskId),
    ...taskLiveQueryOptions,
  });

  const { data: workspaceMembers = [] } = useQuery({
    queryKey: queryKeys.workspaceMembers(workspaceId),
    queryFn: () => workspacesApi.members.list(workspaceId),
    enabled: Boolean(workspaceId) && Boolean(role && isAgencyRole(role)),
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: queryKeys.projectMembers(projectId),
    queryFn: () => projectsApi.members.list(projectId),
    enabled: Boolean(projectId) && Boolean(role && isAgencyRole(role)),
  });

  const projectMemberUserIds = useMemo(
    () => new Set(projectMembers.map((member) => member.userId)),
    [projectMembers],
  );
  const showAssigneeAccessHint = assigneeNeedsProjectAccess(
    isEditing ? editAssigneeId : null,
    projectMemberUserIds,
  );

  const agency = role ? isAgencyRole(role) : false;
  const projectEditable = true;
  const canEditTask = agency && projectEditable && task?.status !== 'DONE';

  const { data: clientsOutside = [] } = useQuery({
    queryKey: queryKeys.clientsOutside(projectId),
    queryFn: () => projectsApi.clientsOutside(projectId),
    enabled:
      Boolean(projectId) &&
      agency &&
      (task?.status === 'INTERNAL_REVIEW' ||
        transitions?.targets.some((t) => t.to === 'CLIENT_HANDOFF')),
  });

  const handoffClients = useHandoffClientOptions(workspaceMembers, clientsOutside);
  const showHandoffPicker =
    canEditTask &&
    handoffClients.length > 0 &&
    (task?.status === 'INTERNAL_REVIEW' ||
      transitions?.targets.some((target) => target.to === 'CLIENT_HANDOFF') ||
      pendingTransition?.to === 'CLIENT_HANDOFF');

  const { transitionMutation, commentMutation, updateDueMutation, invalidateTask } =
    useTaskMutations(taskId, projectId, setTransitionError);

  const saveEditMutation = useMutation({
    mutationFn: async () => {
      const title = editTitle.trim();
      if (!title) {
        throw new Error('Title is required');
      }

      await ensureAssigneeInProject(projectId, editAssigneeId || null, projectMemberUserIds);

      await tasksApi.update(taskId, {
        title,
        description: editDescription,
        assigneeId: editAssigneeId || null,
      });

      const currentDue = toDateInputValue(task!.dueAt);
      if (editDueDate !== currentDue || editDueReason.trim()) {
        await tasksApi.updateDue(
          taskId,
          editDueDate ? dateInputToIso(editDueDate) : null,
          editDueReason.trim() || undefined,
        );
      }
    },
    onSuccess: () => {
      setIsEditing(false);
      invalidateTask();
      queryClient.invalidateQueries({ queryKey: queryKeys.taskDueChanges(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationCount() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
    },
    onError: (err) => {
      setTransitionError(getApiErrorMessage(err, 'Failed to save changes'));
    },
  });

  const blocking = task ? getBlockingHint(task.status) : null;
  const showTransitions = (transitions?.targets.length ?? 0) > 0;
  const canEditDueDate = canEditTask;
  const canSetDueDate = canEditDueDate && !isEditing;
  const showActionsCard =
    projectEditable && task?.status !== 'DONE' && (showTransitions || canSetDueDate);

  function openDueDateForm() {
    setQuickDueDate(toDateInputValue(task!.dueAt));
    setQuickDueReason('');
    setShowDueDateForm(true);
    setTransitionError(null);
  }

  function cancelDueDateForm() {
    setShowDueDateForm(false);
    setQuickDueDate('');
    setQuickDueReason('');
  }

  function handleQuickDueSubmit(event: FormEvent) {
    event.preventDefault();
    if (!quickDueDate) {
      setTransitionError('Due date is required');
      return;
    }
    updateDueMutation.mutate(
      {
        dueDate: quickDueDate,
        reason: quickDueReason.trim() || undefined,
      },
      { onSuccess: () => cancelDueDateForm() },
    );
  }

  function handoffClientIdsForTransition(
    target: AllowedTransitions['targets'][number],
  ): string[] | undefined {
    if (target.to !== 'CLIENT_HANDOFF') {
      return undefined;
    }
    return selectedHandoffClientIds;
  }

  function validateHandoffSelection(target: AllowedTransitions['targets'][number]): boolean {
    if (target.to !== 'CLIENT_HANDOFF') {
      return true;
    }
    if (showHandoffPicker && selectedHandoffClientIds.length === 0) {
      setTransitionError('Select at least one client for handoff');
      return false;
    }
    return true;
  }

  function handleTransition(target: AllowedTransitions['targets'][number]) {
    if (!task) {
      return;
    }
    if (!validateHandoffSelection(target)) {
      return;
    }
    if (target.requiresComment) {
      setPendingTransition(target);
      return;
    }

    transitionMutation.mutate(
      {
        to: target.to,
        clientUserIds: handoffClientIdsForTransition(target),
      },
      {
        onSuccess: () => {
          setPendingTransition(null);
          setCommentBody('');
          setShowDueDateForm(false);
          setSelectedHandoffClientIds([]);
        },
      },
    );
  }

  function handleTransitionWithComment(event: FormEvent) {
    event.preventDefault();
    if (!pendingTransition || !commentBody.trim()) {
      return;
    }
    if (!validateHandoffSelection(pendingTransition)) {
      return;
    }
    transitionMutation.mutate(
      {
        to: pendingTransition.to,
        comment: commentBody.trim(),
        clientUserIds: handoffClientIdsForTransition(pendingTransition),
      },
      {
        onSuccess: () => {
          setPendingTransition(null);
          setCommentBody('');
          setShowDueDateForm(false);
          setSelectedHandoffClientIds([]);
        },
      },
    );
  }

  function handleAddComment(event: FormEvent) {
    event.preventDefault();
    if (!newComment.trim()) {
      return;
    }
    commentMutation.mutate(newComment.trim(), {
      onSuccess: () => setNewComment(''),
    });
  }

  function startEditing() {
    setEditTitle(task!.title);
    setEditDescription(task!.description ?? '');
    setEditAssigneeId(task!.assigneeId ?? '');
    setEditDueDate(toDateInputValue(task!.dueAt));
    setEditDueReason('');
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setShowDueDateForm(false);
  }

  const assigneeOptions = workspaceMemberDropdownOptions(
    filterAssignableMembers(workspaceMembers),
    { includeEmpty: true, emptyLabel: 'Unassigned' },
  );

  return {
    workspaceId,
    projectId,
    taskId,
    task,
    taskLoading,
    taskError,
    comments,
    events,
    dueChanges,
    transitions,
    projectEditable,
    canEditTask,
    isEditing,
    editTitle,
    editDescription,
    editAssigneeId,
    editDueDate,
    editDueReason,
    assigneeOptions,
    showAssigneeAccessHint,
    showActionsCard,
    transitionError,
    handoffClients,
    showHandoffPicker,
    selectedHandoffClientIds,
    showTransitions,
    canSetDueDate,
    showDueDateForm,
    quickDueDate,
    quickDueReason,
    pendingTransition,
    commentBody,
    transitionMutation,
    updateDueMutation,
    commentMutation,
    saveEditMutation,
    newComment,
    blocking,
    setEditTitle,
    setEditDescription,
    setEditAssigneeId,
    setEditDueDate,
    setEditDueReason,
    setSelectedHandoffClientIds,
    setQuickDueDate,
    setQuickDueReason,
    setCommentBody,
    setPendingTransition,
    setNewComment,
    startEditing,
    cancelEditing,
    openDueDateForm,
    cancelDueDateForm,
    handleQuickDueSubmit,
    handleTransition,
    handleTransitionWithComment,
    handleAddComment,
  };
}
