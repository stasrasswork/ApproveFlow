import { type FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commentsApi, projectsApi, tasksApi, workspacesApi } from '../api/endpoints';
import type { TaskStatus } from '../api/types';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AuthorLine } from '../components/ui/RoleBadge';
import { Dropdown } from '../components/ui/Dropdown';
import { Input, TitleInput, Textarea, Field, FormStack, FormActions, InlineFormRow } from '../components/ui/Form';
import { workspaceMemberDropdownOptions } from '../lib/dropdown-options';
import { ensureAssigneeInProject } from '../lib/ensure-assignee';
import { getEventTypeLabel } from '../lib/task-events';
import { StatusBadge } from '../components/ui/StatusBadge';
import {
  dateInputToIso,
  formatDate,
  formatDateTime,
  toDateInputValue,
  userDisplayName,
} from '../lib/format';
import { canChangeTaskStatus, isAgencyRole } from '../lib/roles';
import {
  getBlockingHint,
  getTransitionLabel,
  STATUS_LABELS,
  transitionButtonVariant,
  transitionNeedsComment,
} from '../lib/task-status';

const LIVE_REFETCH_MS = 15_000;

export function TaskPage() {
  const { workspaceId = '', projectId = '', taskId = '' } = useParams();
  const { activeWorkspace } = useAuth();
  const role = activeWorkspace?.role;
  const queryClient = useQueryClient();

  const [commentBody, setCommentBody] = useState('');
  const [newComment, setNewComment] = useState('');
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [pendingTransition, setPendingTransition] = useState<TaskStatus | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueReason, setEditDueReason] = useState('');

  const { data: task } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.get(taskId),
    enabled: Boolean(taskId),
  });

  const { data: transitions } = useQuery({
    queryKey: ['task-transitions', taskId],
    queryFn: () => tasksApi.allowedTransitions(taskId),
    enabled: Boolean(taskId),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => commentsApi.list(taskId),
    enabled: Boolean(taskId),
    refetchInterval: LIVE_REFETCH_MS,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['task-events', taskId],
    queryFn: () => tasksApi.events(taskId),
    enabled: Boolean(taskId),
  });

  const { data: dueChanges = [] } = useQuery({
    queryKey: ['task-due-changes', taskId],
    queryFn: () => tasksApi.dueChanges(taskId),
    enabled: Boolean(taskId),
  });

  const { data: workspaceMembers = [] } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => workspacesApi.members.list(workspaceId),
    enabled: Boolean(workspaceId) && Boolean(role && isAgencyRole(role)),
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectsApi.members.list(projectId),
    enabled: Boolean(projectId) && Boolean(role && isAgencyRole(role)),
  });

  const projectMemberUserIds = new Set(projectMembers.map((member) => member.userId));
  const assigneeNeedsProjectAccess = Boolean(
    isEditing && editAssigneeId && !projectMemberUserIds.has(editAssigneeId),
  );

  const invalidateTask = () => {
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    queryClient.invalidateQueries({ queryKey: ['task-transitions', taskId] });
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-stats', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-activity', projectId] });
    queryClient.invalidateQueries({ queryKey: ['task-events', taskId] });
    queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
  };

  const transitionMutation = useMutation({
    mutationFn: ({
      to,
      comment,
    }: {
      to: TaskStatus;
      comment?: string;
    }) => tasksApi.transition(taskId, to, comment),
    onSuccess: () => {
      setPendingTransition(null);
      setCommentBody('');
      setTransitionError(null);
      invalidateTask();
    },
    onError: (err) => {
      setTransitionError(
        err instanceof ApiError ? err.message : 'Failed to change status',
      );
    },
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => commentsApi.create(taskId, body),
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      queryClient.invalidateQueries({
        queryKey: ['project-activity', projectId],
      });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['task-due-changes', taskId] });
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
    },
  });

  if (!task) {
    return (
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        Loading…
      </div>
    );
  }

  const blocking = getBlockingHint(task.status);
  const agency = role ? isAgencyRole(role) : false;
  const showTransitions =
    role && canChangeTaskStatus(role) && (transitions?.targets.length ?? 0) > 0;

  function handleTransition(to: TaskStatus) {
    if (!role || !task) {
      return;
    }

    if (transitionNeedsComment(task.status, to, role)) {
      setPendingTransition(to);
      return;
    }

    transitionMutation.mutate({ to });
  }

  function handleTransitionWithComment(event: FormEvent) {
    event.preventDefault();
    if (!pendingTransition || !commentBody.trim()) {
      return;
    }
    transitionMutation.mutate({
      to: pendingTransition,
      comment: commentBody.trim(),
    });
  }

  function handleAddComment(event: FormEvent) {
    event.preventDefault();
    if (!newComment.trim()) {
      return;
    }
    commentMutation.mutate(newComment.trim());
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
  }

  const assigneeOptions = workspaceMemberDropdownOptions(
    workspaceMembers.filter(
      (m) =>
        m.role === 'MEMBER' || m.role === 'MANAGER' || m.role === 'ADMIN',
    ),
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
        <div className="mt-5">
          <InlineFormRow>
            {isEditing ? (
              <TitleInput
                id="task-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="min-w-[12rem] flex-1"
                aria-label="Task title"
                required
              />
            ) : (
              <h1 className="font-display text-3xl font-bold">{task.title}</h1>
            )}
            <StatusBadge status={task.status} size="md" />
            {agency && isEditing ? (
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
            {agency && !isEditing ? (
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
              {isEditing && agency ? (
                <Textarea
                  id="description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {task.description || 'No description'}
                </p>
              )}
            </Card>

          {showTransitions ? (
            <Card title="Actions" accent="violet">
              {transitionError ? (
                <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {transitionError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {transitions!.targets.map((to) => (
                  <Button
                    key={to}
                    variant={transitionButtonVariant(task.status, to)}
                    disabled={transitionMutation.isPending}
                    onClick={() => handleTransition(to)}
                  >
                    {getTransitionLabel(task.status, to)}
                  </Button>
                ))}
              </div>
            </Card>
          ) : null}

          {pendingTransition ? (
            <Card title="Comment required" accent="rose">
              <form onSubmit={handleTransitionWithComment}>
                <FormStack>
                  <Field label="Comment">
                    <Textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder="Describe what needs to be changed"
                      required
                    />
                  </Field>
                  <FormActions>
                    <Button type="submit" disabled={transitionMutation.isPending}>
                      {getTransitionLabel(task.status, pendingTransition)}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setPendingTransition(null);
                        setCommentBody('');
                      }}
                    >
                      Cancel
                    </Button>
                  </FormActions>
                </FormStack>
              </form>
            </Card>
          ) : null}

          <Card title="Comments" accent="amber">
            <ul className="mb-4 space-y-3">
              {comments.length === 0 ? (
                <li className="text-sm text-slate-500">No comments yet.</li>
              ) : (
                comments.map((comment) => (
                  <li
                    key={comment.id}
                    className="rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 py-3"
                  >
                    <div>
                      <AuthorLine
                        author={comment.author}
                        role={comment.authorRole}
                        timestamp={formatDateTime(comment.createdAt)}
                      />
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {comment.body}
                      </p>
                    </div>
                  </li>
                ))
              )}
            </ul>
            <form onSubmit={handleAddComment}>
              <FormStack>
                <Field label="Add comment">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment…"
                  />
                </Field>
                <FormActions>
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={commentMutation.isPending}
                  >
                    Post comment
                  </Button>
                </FormActions>
              </FormStack>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Details" accent="emerald">
            <FormStack>
              <Field label="Assignee">
                {isEditing && agency ? (
                  <>
                    <Dropdown
                      value={editAssigneeId}
                      onChange={setEditAssigneeId}
                      options={assigneeOptions}
                      compactTrigger
                      fullWidth
                    />
                    {assigneeNeedsProjectAccess ? (
                      <p className="mt-1.5 text-xs text-amber-700">
                        Assignee is not on this project yet — they will be added
                        automatically when you save.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm font-medium text-slate-800">
                    {userDisplayName(task.assignee) || 'Unassigned'}
                  </p>
                )}
              </Field>
              <Field label="Created by">
                <p className="text-sm font-medium text-slate-800">
                  {userDisplayName(task.creator)}
                </p>
              </Field>
              <Field label="Due date">
                {isEditing && agency ? (
                  <Input
                    id="due"
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-800">
                    {formatDate(task.dueAt)}
                  </p>
                )}
              </Field>
              {isEditing && agency ? (
                <Field label="Due date reason" htmlFor="due-reason">
                  <Input
                    id="due-reason"
                    value={editDueReason}
                    onChange={(e) => setEditDueReason(e.target.value)}
                    placeholder="Optional"
                  />
                </Field>
              ) : null}
            </FormStack>
          </Card>

          <Card title="Status history" accent="violet">
            <ul className="space-y-3 text-sm">
              {events.length === 0 ? (
                <li className="text-slate-500">No history yet.</li>
              ) : (
                events.map((event) => {
                  const eventLabel = getEventTypeLabel(
                    event.type,
                    event.approvalType,
                  );
                  return (
                  <li
                    key={event.id}
                    className="relative border-l-2 border-brand-200 pl-4"
                  >
                    <p className="font-medium text-slate-800">
                      {STATUS_LABELS[event.fromStatus]} →{' '}
                      {STATUS_LABELS[event.toStatus]}
                    </p>
                    {eventLabel ? (
                      <p className="mt-0.5 text-xs font-medium text-brand-700">
                        {eventLabel}
                      </p>
                    ) : null}
                    {event.comment ? (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        {event.comment}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">
                      {userDisplayName(event.actor)} ·{' '}
                      {formatDateTime(event.createdAt)}
                    </p>
                  </li>
                  );
                })
              )}
            </ul>
          </Card>

          {dueChanges.length > 0 ? (
            <Card title="Due date history" accent="amber">
              <ul className="space-y-3 text-sm">
                {dueChanges.map((change) => (
                  <li key={change.id}>
                    <p className="font-medium">
                      {formatDate(change.oldDueAt)} →{' '}
                      {formatDate(change.newDueAt)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {userDisplayName(change.changedBy)} ·{' '}
                      {formatDateTime(change.createdAt)}
                      {change.reason ? ` · ${change.reason}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
