import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi, tasksApi } from '../api/endpoints';
import type { ProjectStatus } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { MemberRemoveDialog } from '../components/MemberRemoveDialog';
import { ProjectActivityItem } from '../components/ProjectActivityItem';
import { ProjectMembersSection } from '../components/project/ProjectMembersSection';
import { ProjectStatsOverview } from '../components/ProjectStatsOverview';
import { ProjectTasksSection } from '../components/project/ProjectTasksSection';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Dropdown } from '../components/ui/Dropdown';
import { Input, Textarea, Field, FormActions } from '../components/ui/Form';
import { LoadingState } from '../components/ui/LoadingState';
import { PageError } from '../components/ui/PageError';
import { ProjectStatusBadge } from '../components/ui/ProjectStatusBadge';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { useProjectMembers } from '../hooks/useProjectMembers';
import { ACTIVITY_PAGE_SIZE, liveQueryOptions } from '../lib/constants';
import { getApiErrorMessage } from '../lib/api-error';
import { workspaceMemberDropdownOptions } from '../lib/dropdown-options';
import { ensureAssigneeInProject } from '../lib/ensure-assignee';
import { dateInputToIso } from '../lib/format';
import { assigneeNeedsProjectAccess } from '../lib/members';
import { isProjectOperational, PROJECT_STATUS_OPTIONS } from '../lib/project-status';
import { queryKeys } from '../lib/query-keys';

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
  const [activityLimit, setActivityLimit] = useState(ACTIVITY_PAGE_SIZE);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const members = useProjectMembers(projectId, workspaceId, role);

  const {
    data: project,
    isLoading: projectLoading,
    isError: projectError,
  } = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => projectsApi.get(projectId),
    enabled: Boolean(projectId),
    ...liveQueryOptions,
  });

  const { data: stats } = useQuery({
    queryKey: queryKeys.projectStats(projectId),
    queryFn: () => projectsApi.stats(projectId),
    enabled: Boolean(projectId),
    ...liveQueryOptions,
  });

  const { data: activity = [] } = useQuery({
    queryKey: queryKeys.projectActivity(projectId),
    queryFn: () => projectsApi.activity(projectId),
    enabled: Boolean(projectId),
    ...liveQueryOptions,
  });

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    isError: tasksError,
  } = useQuery({
    queryKey: queryKeys.tasks(projectId),
    queryFn: () => tasksApi.list(projectId),
    enabled: Boolean(projectId),
    ...liveQueryOptions,
  });

  const showAssigneeAccessHint = assigneeNeedsProjectAccess(
    assigneeId,
    members.projectMemberUserIds,
  );

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      await ensureAssigneeInProject(
        projectId,
        assigneeId,
        members.projectMemberUserIds,
      );
      return tasksApi.create(projectId, {
        title: taskTitle,
        description: taskDescription || undefined,
        assigneeId: assigneeId || undefined,
        dueAt: taskDueDate ? dateInputToIso(taskDueDate) : undefined,
      });
    },
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectStats(projectId) });
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

  const deleteProjectMutation = useMutation({
    mutationFn: () => projectsApi.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(workspaceId) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(workspaceId) });
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

  const canManage = members.canManage;
  const canCreateTask =
    canManage && project ? isProjectOperational(project.status) : false;
  const visibleActivity = activity.slice(0, activityLimit);
  const hasMoreActivity = activity.length > activityLimit;
  const combinedError = actionError ?? members.actionError;

  if (projectError) {
    return <PageError message="Failed to load project." />;
  }

  if (projectLoading && !project) {
    return <LoadingState label="Loading project…" />;
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
      <MemberRemoveDialog
        member={members.memberToRemove}
        isPending={members.removeMemberMutation.isPending}
        onClose={() => members.setMemberToRemove(null)}
        onConfirm={() => {
          if (members.memberToRemove) {
            members.removeMemberMutation.mutate(members.memberToRemove.userId);
          }
        }}
      />
      {project?.status === 'PAUSED' ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This project is paused. New tasks, status changes, and comments are disabled until it is resumed.
        </p>
      ) : null}
      {project?.status === 'COMPLETED' ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          This project is completed. New tasks, status changes, and comments are disabled.
        </p>
      ) : null}
      <ErrorAlert message={combinedError} />
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
                <p className="mt-2 max-w-2xl break-words text-sm leading-relaxed text-slate-500">
                  {project.description}
                </p>
              ) : (
                <p className="mt-2 text-sm italic text-slate-400">No description</p>
              )}
            </>
          )}
        </div>
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
          {canManage && !isEditingProject ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={startEditingProject}
                className="w-full sm:w-auto"
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-rose-600 hover:text-rose-700 sm:w-auto"
                disabled={deleteProjectMutation.isPending}
                onClick={() => setConfirmDeleteProject(true)}
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

          <ProjectTasksSection
            workspaceId={workspaceId}
            projectId={projectId}
            tasks={tasks}
            tasksLoading={tasksLoading}
            tasksError={tasksError}
            canCreateTask={canCreateTask}
            showCreateTask={showCreateTask}
            taskTitle={taskTitle}
            taskDescription={taskDescription}
            taskDueDate={taskDueDate}
            assigneeId={assigneeId}
            assigneeOptions={workspaceMemberDropdownOptions(members.assignableMembers, {
              includeEmpty: true,
              emptyLabel: 'Unassigned',
            })}
            showAssigneeAccessHint={showAssigneeAccessHint}
            createPending={createTaskMutation.isPending}
            onToggleCreateTask={() => setShowCreateTask((v) => !v)}
            onTaskTitleChange={setTaskTitle}
            onTaskDescriptionChange={setTaskDescription}
            onTaskDueDateChange={setTaskDueDate}
            onAssigneeIdChange={setAssigneeId}
            onCreateTask={handleCreateTask}
          />

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
          <ProjectMembersSection
            projectMembers={members.projectMembers}
            roleByUserId={members.roleByUserId}
            availableForProject={members.availableForProject}
            memberUserId={members.memberUserId}
            addPending={members.addMemberMutation.isPending}
            removePending={members.removeMemberMutation.isPending}
            onMemberUserIdChange={members.setMemberUserId}
            onAddMember={() =>
              members.addMemberMutation.mutate(members.memberUserId)
            }
            onRemoveMember={members.setMemberToRemove}
            memberDropdownOptions={workspaceMemberDropdownOptions(
              members.availableForProject,
            )}
          />
        ) : null}
      </div>
    </div>
  );
}
