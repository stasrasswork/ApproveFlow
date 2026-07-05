import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi, workspacesApi } from '../api/endpoints';
import { getApiErrorMessage } from '../lib/api-error';
import { filterAssignableMembers } from '../lib/members';
import { queryKeys } from '../lib/query-keys';
import { isAgencyRole } from '../lib/roles';
import type { WorkspaceRole } from '../api/types';
import { useMemo, useState } from 'react';

export function useProjectMembers(
  projectId: string,
  workspaceId: string,
  role: WorkspaceRole | undefined,
) {
  const queryClient = useQueryClient();
  const canManage = Boolean(role && isAgencyRole(role));
  const [memberUserId, setMemberUserId] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: projectMembers = [] } = useQuery({
    queryKey: queryKeys.projectMembers(projectId),
    queryFn: () => projectsApi.members.list(projectId),
    enabled: Boolean(projectId) && canManage,
  });

  const { data: workspaceMembers = [] } = useQuery({
    queryKey: queryKeys.workspaceMembers(workspaceId),
    queryFn: () => workspacesApi.members.list(workspaceId),
    enabled: Boolean(workspaceId) && canManage,
  });

  const projectMemberUserIds = useMemo(
    () => new Set(projectMembers.map((member) => member.userId)),
    [projectMembers],
  );

  const availableForProject = useMemo(() => {
    const inProject = new Set(projectMembers.map((member) => member.userId));
    return workspaceMembers.filter((member) => !inProject.has(member.userId));
  }, [workspaceMembers, projectMembers]);

  const roleByUserId = useMemo(
    () => new Map(workspaceMembers.map((member) => [member.userId, member.role])),
    [workspaceMembers],
  );

  const assignableMembers = useMemo(
    () => filterAssignableMembers(workspaceMembers),
    [workspaceMembers],
  );

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.members.add(projectId, userId),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectMembers(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clientsOutside(projectId),
      });
      setMemberUserId('');
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, 'Failed to add member'));
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.members.remove(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectMembers(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clientsOutside(projectId),
      });
      setMemberToRemove(null);
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, 'Failed to remove member'));
      setMemberToRemove(null);
    },
  });

  return {
    projectMembers,
    workspaceMembers,
    assignableMembers,
    projectMemberUserIds,
    availableForProject,
    roleByUserId,
    memberUserId,
    setMemberUserId,
    memberToRemove,
    setMemberToRemove,
    actionError,
    setActionError,
    addMemberMutation,
    removeMemberMutation,
    canManage,
  };
}
