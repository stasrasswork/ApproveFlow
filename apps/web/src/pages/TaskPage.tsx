import { type FormEvent, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commentsApi, projectsApi, tasksApi, workspacesApi } from '../api/endpoints';
import type { AllowedTransitions } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { TaskActionsSection } from '../components/task/TaskActionsSection';
import { TaskCommentsSection } from '../components/task/TaskCommentsSection';
import { TaskDetailsSidebar } from '../components/task/TaskDetailsSidebar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingState } from '../components/ui/LoadingState';
import { PageError } from '../components/ui/PageError';
import { TitleInput, Textarea, InlineFormRow } from '../components/ui/Form';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useHandoffClientOptions } from '../hooks/useHandoffClientOptions';
import { useTaskMutations } from '../hooks/useTaskMutations';
import { getApiErrorMessage } from '../lib/api-error';
import { liveQueryOptions } from '../lib/constants';
import { queryKeys } from '../lib/query-keys';
import { workspaceMemberDropdownOptions } from '../lib/dropdown-options';
import { ensureAssigneeInProject } from '../lib/ensure-assignee';
import {
  dateInputToIso,
  toDateInputValue,
} from '../lib/format';
import {
  assigneeNeedsProjectAccess,
  filterAssignableMembers,
} from '../lib/members';
import { isAgencyRole } from '../lib/roles';
import { roleForWorkspace } from '../lib/route-workspace-role';
import { isProjectEditable } from '../lib/project-status';
import { getBlockingHint } from '../lib/task-status';

export function TaskPage() {
  const { workspaceId = '', projectId = '', taskId = '' } = useParams();
  const { user } = useAuth();
  const role = roleForWorkspace(user, workspaceId);
  const queryClient = useQueryClient();

  const [commentBody, setCommentBody] = useState('');
  const [newComment, setNewComment] = useState('');
  const [selectedHandoffClientIds, setSelectedHandoffClientIds] = useState<
    string[]
  >([]);
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
    ...liveQueryOptions,
  });

  const { data: transitions } = useQuery({
    queryKey: queryKeys.taskTransitions(taskId),
    queryFn: () => tasksApi.allowedTransitions(taskId),
    enabled: Boolean(taskId),
    ...liveQueryOptions,
  });

  const { data: comments = [] } = useQuery({
    queryKey: queryKeys.comments(taskId),
    queryFn: () => commentsApi.list(taskId),
    enabled: Boolean(taskId),
    ...liveQueryOptions,
  });

  const { data: events = [] } = useQuery({
    queryKey: queryKeys.taskEvents(taskId),
    queryFn: () => tasksApi.events(taskId),
    enabled: Boolean(taskId),
    ...liveQueryOptions,
  });

  const { data: dueChanges = [] } = useQuery({
    queryKey: queryKeys.taskDueChanges(taskId),
    queryFn: () => tasksApi.dueChanges(taskId),
    enabled: Boolean(taskId),
    ...liveQueryOptions,
  });

  const { data: project } = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => projectsApi.get(projectId),
    enabled: Boolean(projectId),
    ...liveQueryOptions,
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
  const projectEditable = project ? isProjectEditable(project.status) : true;
  const canEditTask =
    agency && projectEditable && task?.status !== 'DONE';

  const { data: clientsOutside = [] } = useQuery({
    queryKey: queryKeys.clientsOutside(projectId),
    queryFn: () => projectsApi.clientsOutside(projectId),
    enabled:
      Boolean(projectId) &&
      agency &&
      (task?.status === 'INTERNAL_REVIEW' ||
        transitions?.targets.some((t) => t.to === 'CLIENT_HANDOFF')),
  });

  const handoffClients = useHandoffClientOptions(
    workspaceMembers,
    clientsOutside,
  );
  const showHandoffPicker =
    canEditTask &&
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

      await ensureAssigneeInProject(
        projectId,
        editAssigneeId || null,
        projectMemberUserIds,
      );

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

  if (taskLoading) {
    return <LoadingState />;
  }

  if (taskError || !task) {
    return <PageError message="Failed to load task." />;
  }

  const blocking = getBlockingHint(task.status);
  const showTransitions = (transitions?.targets.length ?? 0) > 0;
  const canEditDueDate = canEditTask;
  const canSetDueDate = canEditDueDate && !isEditing;
  const showActionsCard =
    projectEditable &&
    task.status !== 'DONE' &&
    (showTransitions || canSetDueDate);

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

  function validateHandoffSelection(
    target: AllowedTransitions['targets'][number],
  ): boolean {
    if (target.to !== 'CLIENT_HANDOFF') {
      return true;
    }
    if (selectedHandoffClientIds.length === 0) {
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

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={`/w/${workspaceId}/projects/${projectId}`}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          ← Back to project
        </Link>
        {!projectEditable ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            This project is completed. Task editing is disabled.
          </p>
        ) : null}
        <div className="mt-5">
          <InlineFormRow>
            {isEditing && canEditTask ? (
              <TitleInput
                id="task-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full min-w-0 flex-1 sm:min-w-[12rem]"
                aria-label="Task title"
                required
              />
            ) : (
              <h1 className="min-w-0 break-words text-3xl font-semibold tracking-tight text-slate-900">
                {task.title}
              </h1>
            )}
            <StatusBadge status={task.status} size="md" />
            {canEditTask && isEditing ? (
              <>
                <Button
                  type="button"
                  onClick={() => saveEditMutation.mutate()}
                  disabled={saveEditMutation.isPending}
                >
                  {saveEditMutation.isPending ? 'Saving…' : 'Save changes'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={cancelEditing}
                  disabled={saveEditMutation.isPending}
                >
                  Cancel
                </Button>
              </>
            ) : null}
            {canEditTask && !isEditing ? (
              <Button type="button" variant="secondary" onClick={startEditing}>
                Edit
              </Button>
            ) : null}
          </InlineFormRow>
        </div>
        {blocking ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-900 ring-1 ring-amber-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
            {blocking}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Description" accent="blue">
            {isEditing && canEditTask ? (
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                {task.description || 'No description'}
              </p>
            )}
          </Card>

          <TaskActionsSection
            showActionsCard={showActionsCard}
            transitionError={transitionError}
            handoffClients={handoffClients}
            showHandoffPicker={Boolean(showHandoffPicker)}
            selectedHandoffClientIds={selectedHandoffClientIds}
            onHandoffClientsChange={setSelectedHandoffClientIds}
            showTransitions={showTransitions}
            transitions={transitions}
            canSetDueDate={canSetDueDate}
            showDueDateForm={showDueDateForm}
            taskDueAt={task.dueAt}
            quickDueDate={quickDueDate}
            quickDueReason={quickDueReason}
            pendingTransition={pendingTransition}
            commentBody={commentBody}
            transitionPending={transitionMutation.isPending}
            updateDuePending={updateDueMutation.isPending}
            onTransition={handleTransition}
            onOpenDueDateForm={openDueDateForm}
            onQuickDueDateChange={setQuickDueDate}
            onQuickDueReasonChange={setQuickDueReason}
            onQuickDueSubmit={handleQuickDueSubmit}
            onCancelDueDateForm={cancelDueDateForm}
            onCommentBodyChange={setCommentBody}
            onTransitionWithComment={handleTransitionWithComment}
            onCancelPendingTransition={() => {
              setPendingTransition(null);
              setCommentBody('');
            }}
          />

          <TaskCommentsSection
            comments={comments}
            newComment={newComment}
            onNewCommentChange={setNewComment}
            onSubmit={handleAddComment}
            isPending={commentMutation.isPending}
          />
        </div>

        <TaskDetailsSidebar
          task={task}
          isEditing={isEditing}
          canEdit={canEditTask}
          canEditDueDate={canEditDueDate}
          editAssigneeId={editAssigneeId}
          editDueDate={editDueDate}
          editDueReason={editDueReason}
          assigneeOptions={assigneeOptions}
          showAssigneeAccessHint={showAssigneeAccessHint}
          events={events}
          dueChanges={dueChanges}
          onEditAssigneeChange={setEditAssigneeId}
          onEditDueDateChange={setEditDueDate}
          onEditDueReasonChange={setEditDueReason}
        />
      </div>
    </div>
  );
}
