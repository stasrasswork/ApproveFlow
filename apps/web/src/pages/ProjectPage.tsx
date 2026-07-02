import { type FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi, tasksApi, workspacesApi } from '../api/endpoints';
import type { ProjectStatus, TaskView } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { ProjectActivityItem } from '../components/ProjectActivityItem';
import { ProjectStatsOverview } from '../components/ProjectStatsOverview';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DatePickerInput } from '../components/ui/DatePickerInput';
import { Dropdown } from '../components/ui/Dropdown';
import { Input, Textarea, Field, FormStack, FormActions } from '../components/ui/Form';
import { ProjectStatusBadge } from '../components/ui/ProjectStatusBadge';
import { RoleBadge } from '../components/ui/RoleBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { ACTIVITY_PAGE_SIZE, liveQueryOptions } from '../lib/constants';
import { getApiErrorMessage } from '../lib/api-error';
import { workspaceMemberDropdownOptions } from '../lib/dropdown-options';
import { ensureAssigneeInProject } from '../lib/ensure-assignee';
import { userDisplayName, formatDate, formatDaysUntil, dateInputToIso } from '../lib/format';
import {
  assigneeNeedsProjectAccess,
  filterAssignableMembers,
} from '../lib/members';
import { isProjectOperational } from '../lib/project-status';
import { isAgencyRole } from '../lib/roles';
import { getBlockingHint, PROJECT_STATUS_OPTIONS } from '../lib/task-status';

export function ProjectPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const navigate = useNavigate();
  const { activeWorkspace } = useAuth();
  const role = activeWorkspace?.role;
  const queryClient = useQueryClient();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');
  const [editProjectStatus, setEditProjectStatus] = useState<ProjectStatus>('ACTIVE');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [memberUserId, setMemberUserId] = useState('');
  const [activityLimit, setActivityLimit] = useState(ACTIVITY_PAGE_SIZE);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: Boolean(projectId),
    ...liveQueryOptions,
  });

  const { data: stats } = useQuery({
    queryKey: ['project-stats', projectId],
    queryFn: () => projectsApi.stats(projectId),
    enabled: Boolean(projectId),
    ...liveQueryOptions,
  });

  const { data: activity = [] } = useQuery({
    queryKey: ['project-activity', projectId],
    queryFn: () => projectsApi.activity(projectId),
    enabled: Boolean(projectId),
    ...liveQueryOptions,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
    enabled: Boolean(projectId),
    ...liveQueryOptions,
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectsApi.members.list(projectId),
    enabled: Boolean(projectId) && Boolean(role && isAgencyRole(role)),
  });

  const { data: workspaceMembers = [] } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => workspacesApi.members.list(workspaceId),
    enabled: Boolean(workspaceId) && Boolean(role && isAgencyRole(role)),
  });

  const assignableMembers = useMemo(
    () => filterAssignableMembers(workspaceMembers),
    [workspaceMembers],
  );

  const roleByUserId = useMemo(
    () => new Map(workspaceMembers.map((member) => [member.userId, member.role])),
    [workspaceMembers],
  );

  const availableForProject = useMemo(() => {
    const inProject = new Set(projectMembers.map((m) => m.userId));
    return workspaceMembers.filter((m) => !inProject.has(m.userId));
  }, [workspaceMembers, projectMembers]);

  const projectMemberUserIds = useMemo(
    () => new Set(projectMembers.map((member) => member.userId)),
    [projectMembers],
  );

  const showAssigneeAccessHint = assigneeNeedsProjectAccess(
    assigneeId,
    projectMemberUserIds,
  );

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      await ensureAssigneeInProject(projectId, assigneeId, projectMemberUserIds);
      return tasksApi.create(projectId, {
        title: taskTitle,
        description: taskDescription || undefined,
        assigneeId: assigneeId || undefined,
        dueAt: taskDueDate ? dateInputToIso(taskDueDate) : undefined,
      });
    },
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-stats', projectId] });
      setShowCreateTask(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskDueDate('');
      setAssigneeId('');
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, 'Failed to create task'));
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.members.add(projectId, userId),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      setMemberUserId('');
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, 'Failed to add member'));
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.members.remove(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      setMemberToRemove(null);
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, 'Failed to remove member'));
      setMemberToRemove(null);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => projectsApi.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
      setConfirmDeleteProject(false);
      navigate(`/w/${workspaceId}/projects`, { replace: true });
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, 'Failed to delete project'));
      setConfirmDeleteProject(false);
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: (data: {
      name?: string;
      description?: string;
      status?: ProjectStatus;
    }) => projectsApi.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
      setIsEditingProject(false);
      setActionError(null);
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, 'Failed to update project'));
    },
  });

  function handleCreateTask(event: FormEvent) {
    event.preventDefault();
    setActionError(null);
    createTaskMutation.mutate();
  }

  function startEditingProject() {
    if (!project) {
      return;
    }
    setEditProjectName(project.name);
    setEditProjectDescription(project.description ?? '');
    setEditProjectStatus(project.status);
    setIsEditingProject(true);
  }

  function cancelEditingProject() {
    setIsEditingProject(false);
  }

  function handleSaveProject() {
    const name = editProjectName.trim();
    if (!name) {
      return;
    }
    updateProjectMutation.mutate({
      name,
      description: editProjectDescription || undefined,
      status: editProjectStatus,
    });
  }

  const canManage = role ? isAgencyRole(role) : false;
  const canCreateTask =
    canManage && project ? isProjectOperational(project.status) : false;
  const visibleActivity = activity.slice(0, activityLimit);
  const hasMoreActivity = activity.length > activityLimit;

  function handleDeleteProject() {
    setConfirmDeleteProject(true);
  }

  return (
    <div className="space-y-8">
      <ConfirmDialog
        open={confirmDeleteProject}
        title="Delete project?"
        description="This will permanently delete the project and all its tasks. This action cannot be undone."
        confirmLabel="Delete project"
        loading={deleteProjectMutation.isPending}
        onConfirm={() => deleteProjectMutation.mutate()}
        onCancel={() => setConfirmDeleteProject(false)}
      />
      <ConfirmDialog
        open={memberToRemove !== null}
        title="Remove from project?"
        description={
          memberToRemove ? (
            <>
              Remove <strong>{memberToRemove.name}</strong> from this project?
              They will lose access to its tasks unless added again.
            </>
          ) : null
        }
        confirmLabel="Remove member"
        loading={removeMemberMutation.isPending}
        onConfirm={() => {
          if (memberToRemove) {
            removeMemberMutation.mutate(memberToRemove.userId);
          }
        }}
        onCancel={() => setMemberToRemove(null)}
      />
      {project?.status === 'PAUSED' ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This project is paused. Work can continue, but consider resuming when ready.
        </p>
      ) : null}
      {project?.status === 'COMPLETED' ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          This project is completed. New tasks and status changes are disabled.
        </p>
      ) : null}
      <ErrorAlert message={actionError} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            to={`/w/${workspaceId}/projects`}
            className="inline-flex text-sm font-medium text-brand-600 transition hover:text-brand-700"
          >
            ← All projects
          </Link>
          {isEditingProject && project ? (
            <div className="mt-4 max-w-2xl space-y-4 rounded-xl border border-slate-200/70 bg-slate-50/50 p-4">
              <Field label="Name" htmlFor="project-name-edit">
                <Input
                  id="project-name-edit"
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Description" htmlFor="project-desc-edit">
                <Textarea
                  id="project-desc-edit"
                  value={editProjectDescription}
                  onChange={(e) => setEditProjectDescription(e.target.value)}
                />
              </Field>
              <Field label="Project status">
                <Dropdown
                  value={editProjectStatus}
                  onChange={(value) => setEditProjectStatus(value as ProjectStatus)}
                  options={PROJECT_STATUS_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  compactTrigger
                  fullWidth
                />
              </Field>
              <FormActions>
                <Button
                  type="button"
                  onClick={handleSaveProject}
                  disabled={updateProjectMutation.isPending}
                >
                  {updateProjectMutation.isPending ? 'Saving…' : 'Save changes'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={cancelEditingProject}
                  disabled={updateProjectMutation.isPending}
                >
                  Cancel
                </Button>
              </FormActions>
            </div>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
                  {project?.name ?? '…'}
                </h1>
                {project ? <ProjectStatusBadge status={project.status} /> : null}
              </div>
              {project?.description ? (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                  {project.description}
                </p>
              ) : (
                <p className="mt-2 text-sm italic text-slate-400">No description</p>
              )}
            </>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canManage && !isEditingProject ? (
            <>
              <Button type="button" variant="secondary" onClick={startEditingProject}>
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-rose-600 hover:text-rose-700"
                disabled={deleteProjectMutation.isPending}
                onClick={handleDeleteProject}
              >
                Delete project
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className={`grid gap-6 ${canManage ? 'lg:grid-cols-3' : ''}`}>
        <div className={`space-y-6 ${canManage ? 'lg:col-span-2' : ''}`}>
          {stats ? <ProjectStatsOverview stats={stats} /> : null}

          <Card
            title="Tasks"
            accent="blue"
            actions={
              role && canCreateTask ? (
                <Button
                  type="button"
                  onClick={() => setShowCreateTask((v) => !v)}
                >
                  {showCreateTask ? 'Cancel' : '+ New task'}
                </Button>
              ) : undefined
            }
          >
            {showCreateTask ? (
              <div className="mb-5 rounded-xl border border-slate-200/70 bg-slate-50/50 p-4">
                <form onSubmit={handleCreateTask}>
                  <FormStack>
                    <Field label="Title" htmlFor="task-title">
                      <Input
                        id="task-title"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Description" htmlFor="task-desc">
                      <Textarea
                        id="task-desc"
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                      />
                    </Field>
                    <Field label="Assignee" htmlFor="assignee">
                      <Dropdown
                        value={assigneeId}
                        onChange={setAssigneeId}
                        options={workspaceMemberDropdownOptions(assignableMembers, {
                          includeEmpty: true,
                          emptyLabel: 'Unassigned',
                        })}
                        compactTrigger
                        fullWidth
                      />
                      {showAssigneeAccessHint ? (
                        <p className="mt-1.5 text-xs text-amber-700">
                          Assignee is not on this project yet — they will be
                          added automatically when you create the task.
                        </p>
                      ) : null}
                    </Field>
                    <Field label="Due date" htmlFor="task-due">
                      <DatePickerInput
                        id="task-due"
                        value={taskDueDate}
                        onChange={setTaskDueDate}
                        placeholder="Optional"
                      />
                    </Field>
                    <FormActions>
                      <Button
                        type="submit"
                        disabled={createTaskMutation.isPending}
                      >
                        Create task
                      </Button>
                    </FormActions>
                  </FormStack>
                </form>
              </div>
            ) : null}

            {tasksLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : tasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
                No tasks yet. Create one to get started.
              </p>
            ) : (
              <ul className="space-y-2">
                {tasks.map((task: TaskView) => {
                  const blocking = getBlockingHint(task.status);
                  const dueRelative = formatDaysUntil(task.dueAt);
                  return (
                    <li key={task.id}>
                      <Link
                        to={`/w/${workspaceId}/projects/${projectId}/tasks/${task.id}`}
                        className="group block rounded-xl border border-slate-200/70 bg-white px-4 py-3.5 transition hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 group-hover:text-brand-700">
                            {task.title}
                          </span>
                          <StatusBadge status={task.status} />
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">
                          {task.assignee
                            ? `Assignee: ${userDisplayName(task.assignee)}`
                            : 'Unassigned'}
                          {task.dueAt
                            ? ` · Due ${formatDate(task.dueAt)}${
                                dueRelative ? ` (${dueRelative})` : ''
                              }`
                            : ''}
                          {blocking ? ` · ${blocking}` : ''}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Activity feed" accent="amber">
            {activity.length === 0 ? (
              <p className="text-sm text-slate-500">No activity yet.</p>
            ) : (
              <>
                <ul>
                  {visibleActivity.map((item) => (
                    <ProjectActivityItem
                      key={`${item.type}-${item.id}`}
                      item={item}
                      workspaceId={workspaceId}
                      projectId={projectId}
                    />
                  ))}
                </ul>
                {hasMoreActivity ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setActivityLimit((limit) => limit + ACTIVITY_PAGE_SIZE)
                      }
                    >
                      Load more ({activity.length - activityLimit} remaining)
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </Card>
        </div>

        {canManage ? (
          <Card title="Project members" accent="emerald">
            <ul className="mb-4 space-y-2">
              {projectMembers.map((member) => {
                const memberRole = roleByUserId.get(member.userId);
                return (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/50 px-3.5 py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-medium text-slate-800">
                      {userDisplayName(member.user)}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {member.user.email}
                    </p>
                    {memberRole ? (
                      <div>
                        <RoleBadge role={memberRole} />
                      </div>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="shrink-0 self-center text-rose-600 hover:text-rose-700"
                    disabled={removeMemberMutation.isPending}
                    onClick={() =>
                      setMemberToRemove({
                        userId: member.userId,
                        name: userDisplayName(member.user),
                      })
                    }
                  >
                    Remove
                  </Button>
                </li>
                );
              })}
            </ul>
            {availableForProject.length > 0 ? (
              <div className="space-y-4 border-t border-slate-100 pt-5">
                <Field label="Add from workspace">
                  <Dropdown
                    value={memberUserId}
                    onChange={setMemberUserId}
                    placeholder="Select user"
                    options={workspaceMemberDropdownOptions(availableForProject)}
                    compactTrigger
                    fullWidth
                  />
                </Field>
                <FormActions>
                  <Button
                    variant="secondary"
                    disabled={!memberUserId || addMemberMutation.isPending}
                    onClick={() => addMemberMutation.mutate(memberUserId)}
                  >
                    Add member
                  </Button>
                </FormActions>
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
