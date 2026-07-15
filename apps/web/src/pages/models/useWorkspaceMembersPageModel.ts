import { type FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, workspacesApi } from '../../api/endpoints';
import type { WorkspaceRole } from '../../api/types';
import { useAuth } from '../../auth/useAuth';
import { getApiErrorMessage } from '../../lib/api-error';
import { listLiveQueryOptions } from '../../lib/constants';
import { roleDropdownOptions } from '../../lib/dropdown-options';
import { queryKeys } from '../../lib/query-keys';
import {
  canChangeMemberRoles,
  canDeleteWorkspace,
  canRemoveMembers,
  canUpdateWorkspace,
  isAgencyRole,
} from '../../lib/roles';
import { roleForWorkspace } from '../../lib/route-workspace-role';
import { isValidSlug, SLUG_VALIDATION_MESSAGE } from '@approveflow/shared';

export function useWorkspaceMembersPageModel() {
  const { workspaceId = '' } = useParams();
  const navigate = useNavigate();
  const { user, activeWorkspace, refreshUser } = useAuth();
  const role = roleForWorkspace(user, workspaceId);
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('MEMBER');
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteDevLink, setInviteDevLink] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [confirmDeleteWorkspace, setConfirmDeleteWorkspace] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const {
    data: workspace,
    isError: workspaceError,
    isLoading: workspaceLoading,
  } = useQuery({
    queryKey: queryKeys.workspace(workspaceId),
    queryFn: () => workspacesApi.get(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const {
    data: members = [],
    isLoading: membersLoading,
    isError: membersError,
  } = useQuery({
    queryKey: queryKeys.workspaceMembers(workspaceId),
    queryFn: () => workspacesApi.members.list(workspaceId),
    enabled: Boolean(workspaceId) && role !== 'CLIENT_VIEW' && role != null,
    ...listLiveQueryOptions,
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      workspacesApi.members.invite(workspaceId, email, inviteRole),
    onSuccess: (result) => {
      setInviteError(null);
      if (result.status === 'added') {
        setInviteSuccess('Member added to workspace.');
        setInviteDevLink(null);
        queryClient.invalidateQueries({
          queryKey: queryKeys.workspaceMembers(workspaceId),
        });
        setEmail('');
        return;
      }

      setInviteSuccess(result.message);
      if (result.inviteToken) {
        setInviteDevLink(
          `/register?invite=${result.inviteToken}&email=${encodeURIComponent(email)}`,
        );
      } else {
        setInviteDevLink(null);
      }
      setEmail('');
    },
    onError: (err) => {
      setInviteError(getApiErrorMessage(err, 'Failed to invite member'));
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({
      userId,
      newRole,
    }: {
      userId: string;
      newRole: WorkspaceRole;
    }) => workspacesApi.members.updateRole(workspaceId, userId, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceMembers(workspaceId),
      });
    },
    onError: (err) => {
      setSettingsError(getApiErrorMessage(err, 'Failed to update role'));
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      workspacesApi.members.remove(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceMembers(workspaceId),
      });
      setMemberToRemove(null);
    },
    onError: (err) => {
      setSettingsError(getApiErrorMessage(err, 'Failed to remove member'));
      setMemberToRemove(null);
    },
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: (data: { name?: string; slug?: string }) =>
      workspacesApi.update(workspaceId, data),
    onSuccess: async () => {
      setSettingsError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.workspace(workspaceId) });
      await refreshUser();
    },
    onError: (err) => {
      setSettingsError(getApiErrorMessage(err, 'Failed to update workspace'));
    },
  });

  const profileMutation = useMutation({
    mutationFn: (name: string) => authApi.updateProfile(name),
    onSuccess: async () => {
      setProfileError(null);
      setProfileSuccess('Display name updated.');
      await refreshUser();
    },
    onError: (err) => {
      setProfileSuccess(null);
      setProfileError(getApiErrorMessage(err, 'Failed to update name'));
    },
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: () => workspacesApi.delete(workspaceId),
    onSuccess: async () => {
      setSettingsError(null);
      setConfirmDeleteWorkspace(false);
      await refreshUser();
      navigate('/', { replace: true });
    },
    onError: (err) => {
      setSettingsError(getApiErrorMessage(err, 'Failed to delete workspace'));
      setConfirmDeleteWorkspace(false);
    },
  });

  function handleInvite(event: FormEvent) {
    event.preventDefault();
    setInviteError(null);
    inviteMutation.mutate();
  }

  function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    const name = (profileName.trim() || user?.name)?.trim();
    if (!name) {
      setProfileError('Display name cannot be empty.');
      return;
    }
    profileMutation.mutate(name);
  }

  function handleWorkspaceSettings(event: FormEvent) {
    event.preventDefault();
    setSettingsError(null);

    const name = (workspaceName.trim() || workspace?.name)?.trim();
    const slug = (workspaceSlug.trim() || workspace?.slug)?.trim();

    if (!name) {
      return;
    }

    if (slug && !isValidSlug(slug)) {
      setSettingsError(SLUG_VALIDATION_MESSAGE);
      return;
    }

    const payload: { name?: string; slug?: string } = {};
    if (name !== workspace?.name) {
      payload.name = name;
    }
    if (slug && slug !== workspace?.slug) {
      payload.slug = slug;
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    updateWorkspaceMutation.mutate(payload);
  }

  const canManage = role ? isAgencyRole(role) : false;
  const canViewMembers = Boolean(role && role !== 'CLIENT_VIEW');
  const canEditRoles = role ? canChangeMemberRoles(role) : false;
  const canRemove = role ? canRemoveMembers(role) : false;
  const canRename = role ? canUpdateWorkspace(role) : false;
  const canDelete = role ? canDeleteWorkspace(role) : false;
  const displayName = workspace?.name ?? activeWorkspace?.name;
  const roleOptions = roleDropdownOptions();

  return {
    workspaceId,
    user,
    workspace,
    workspaceError,
    workspaceLoading,
    members,
    membersLoading,
    membersError,
    email,
    inviteRole,
    inviteError,
    inviteSuccess,
    inviteDevLink,
    inviteMutation,
    memberToRemove,
    removeMemberMutation,
    updateRoleMutation,
    workspaceName,
    workspaceSlug,
    settingsError,
    updateWorkspaceMutation,
    profileName,
    profileError,
    profileSuccess,
    profileMutation,
    confirmDeleteWorkspace,
    deleteWorkspaceMutation,
    canManage,
    canViewMembers,
    canEditRoles,
    canRemove,
    canRename,
    canDelete,
    displayName,
    roleOptions,
    setEmail,
    setInviteRole,
    setMemberToRemove,
    setWorkspaceName,
    setWorkspaceSlug,
    setProfileName,
    setConfirmDeleteWorkspace,
    handleInvite,
    handleProfileSubmit,
    handleWorkspaceSettings,
  };
}
