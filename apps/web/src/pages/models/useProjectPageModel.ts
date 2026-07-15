import { type FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi, tasksApi } from '../../api/endpoints';
import type { ProjectStatus } from '../../api/types';
import { useAuth } from '../../auth/useAuth';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import { getApiErrorMessage } from '../../lib/api-error';
import { ACTIVITY_PAGE_SIZE, listLiveQueryOptions } from '../../lib/constants';
import { workspaceMemberDropdownOptions } from '../../lib/dropdown-options';
import { ensureAssigneeInProject } from '../../lib/ensure-assignee';
import { dateInputToIso } from '../../lib/format';
import { assigneeNeedsProjectAccess } from '../../lib/members';
import { queryKeys } from '../../lib/query-keys';
import { roleForWorkspace } from '../../lib/route-workspace-role';

export function useProjectPageModel() {
  const { workspaceId = '', projectId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = roleForWorkspace(user, workspaceId);
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

  const members = useProjectMembers(projectId, workspaceId, role ?? undefined);

  const {
    data: project,
    isLoading: projectLoading,
    isError: projectError,
  } = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => projectsApi.get(projectId),
    enabled: Boolean(projectId),
    ...listLiveQueryOptions,
  });

  const { data: stats } = useQuery({
    queryKey: queryKeys.projectStats(projectId),
    queryFn: () => projectsApi.stats(projectId),
    enabled: Boolean(projectId),
    ...listLiveQueryOptions,
  });

  const { data: activityPage } = useQuery({
    queryKey: [...queryKeys.projectActivity(projectId), activityLimit],
    queryFn: () => projectsApi.activity(projectId, { limit: activityLimit }),
    enabled: Boolean(projectId),
    ...listLiveQueryOptions,
  });

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    isError: tasksError,
  } = useQuery({
    queryKey: queryKeys.tasks(projectId),
    queryFn: () => tasksApi.list(projectId),
    enabled: Boolean(projectId),
    ...listLiveQueryOptions,
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
  const projectEditable = Boolean(project);
  const canCreateTask = canManage && projectEditable;
  const activity = activityPage?.items ?? [];
  const hasMoreActivity = Boolean(activityPage?.nextCursor);
  const combinedError = actionError ?? members.actionError;
  const assigneeOptions = workspaceMemberDropdownOptions(members.assignableMembers, {
    includeEmpty: true,
    emptyLabel: 'Unassigned',
  });
  const memberDropdownOptions = workspaceMemberDropdownOptions(
    members.availableForProject,
  );

  return {
    workspaceId,
    projectId,
    project,
    projectLoading,
    projectError,
    stats,
    tasks,
    tasksLoading,
    tasksError,
    members,
    isEditingProject,
    editProjectName,
    editProjectDescription,
    editProjectStatus,
    updateProjectMutation,
    canManage,
    projectEditable,
    canCreateTask,
    showCreateTask,
    taskTitle,
    taskDescription,
    taskDueDate,
    assigneeId,
    assigneeOptions,
    memberDropdownOptions,
    showAssigneeAccessHint,
    createTaskMutation,
    activity,
    hasMoreActivity,
    activityPageSize: ACTIVITY_PAGE_SIZE,
    activityLimit,
    combinedError,
    confirmDeleteProject,
    deleteProjectMutation,
    setConfirmDeleteProject,
    setEditProjectName,
    setEditProjectDescription,
    setEditProjectStatus,
    setShowCreateTask,
    setTaskTitle,
    setTaskDescription,
    setTaskDueDate,
    setAssigneeId,
    setActivityLimit,
    handleCreateTask,
    startEditingProject,
    cancelEditingProject,
    handleSaveProject,
  };
}
