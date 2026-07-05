import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, workspacesApi } from '../api/endpoints';
import type { WorkspaceRole } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { MemberRemoveDialog } from '../components/MemberRemoveDialog';
import { InviteMemberCard } from '../components/settings/InviteMemberCard';
import { MembersTableCard } from '../components/settings/MembersTableCard';
import { ProfileSettingsCard } from '../components/settings/ProfileSettingsCard';
import { WorkspaceSettingsCard } from '../components/settings/WorkspaceSettingsCard';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingState } from '../components/ui/LoadingState';
import { PageError } from '../components/ui/PageError';
import { getApiErrorMessage } from '../lib/api-error';
import { liveQueryOptions } from '../lib/constants';
import { roleDropdownOptions } from '../lib/dropdown-options';
import { queryKeys } from '../lib/query-keys';
import {
  canChangeMemberRoles,
  canDeleteWorkspace,
  canRemoveMembers,
  canUpdateWorkspace,
  isAgencyRole,
} from '../lib/roles';
import { isValidSlug, SLUG_VALIDATION_MESSAGE } from '../lib/slug';

export function WorkspaceMembersPage() {
  const { workspaceId = '' } = useParams();
  const navigate = useNavigate();
  const { user, activeWorkspace, refreshUser } = useAuth();
  const role = activeWorkspace?.role;
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
    enabled: Boolean(workspaceId),
    ...liveQueryOptions,
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
  const canEditRoles = role ? canChangeMemberRoles(role) : false;
  const canRemove = role ? canRemoveMembers(role) : false;
  const canRename = role ? canUpdateWorkspace(role) : false;
  const canDelete = role ? canDeleteWorkspace(role) : false;

  const displayName = workspace?.name ?? activeWorkspace?.name;
  const roleOptions = roleDropdownOptions();

  if (workspaceError) {
    return <PageError message="Failed to load workspace settings." />;
  }

  if (workspaceLoading && !workspace) {
    return <LoadingState label="Loading settings…" />;
  }

  return (
    <div className="space-y-8">
      <ConfirmDialog
        open={confirmDeleteWorkspace}
        title="Delete workspace?"
        description="This will permanently delete the workspace, all projects, and tasks. This action cannot be undone."
        confirmLabel="Delete workspace"
        loading={deleteWorkspaceMutation.isPending}
        onConfirm={() => deleteWorkspaceMutation.mutate()}
        onCancel={() => setConfirmDeleteWorkspace(false)}
      />
      <MemberRemoveDialog
        scope="workspace"
        member={memberToRemove}
        isPending={removeMemberMutation.isPending}
        onClose={() => setMemberToRemove(null)}
        onConfirm={() => {
          if (memberToRemove) {
            removeMemberMutation.mutate(memberToRemove.userId);
          }
        }}
      />
      <div>
        <Link
          to={`/w/${workspaceId}/projects`}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          ← All projects
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold">Settings</h1>
        <p className="text-slate-500">{displayName}</p>
      </div>

      <ProfileSettingsCard
        user={user}
        profileError={profileError}
        profileSuccess={profileSuccess}
        isPending={profileMutation.isPending}
        onProfileNameChange={setProfileName}
        onSubmit={handleProfileSubmit}
      />

      {canRename ? (
        <WorkspaceSettingsCard
          workspace={workspace}
          settingsError={settingsError}
          canDelete={canDelete}
          updatePending={updateWorkspaceMutation.isPending}
          deletePending={deleteWorkspaceMutation.isPending}
          onWorkspaceNameChange={setWorkspaceName}
          onWorkspaceSlugChange={setWorkspaceSlug}
          onSubmit={handleWorkspaceSettings}
          onDeleteClick={() => setConfirmDeleteWorkspace(true)}
        />
      ) : null}

      {canManage ? (
        <InviteMemberCard
          email={email}
          inviteRole={inviteRole}
          inviteError={inviteError}
          inviteSuccess={inviteSuccess}
          roleOptions={roleOptions}
          isPending={inviteMutation.isPending}
          onEmailChange={setEmail}
          onInviteRoleChange={setInviteRole}
          onSubmit={handleInvite}
          devLinkContent={
            inviteDevLink ? (
              <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 ring-1 ring-amber-100">
                Dev mode: share{' '}
                <Link
                  to={inviteDevLink}
                  className="font-semibold text-brand-600 hover:text-brand-700"
                >
                  registration link
                </Link>
              </p>
            ) : null
          }
        />
      ) : null}

      <MembersTableCard
        members={members}
        membersLoading={membersLoading}
        membersError={membersError}
        currentUserId={user?.id}
        canEditRoles={canEditRoles}
        canRemove={canRemove}
        removePending={removeMemberMutation.isPending}
        roleOptions={roleOptions}
        onRoleChange={(userId, newRole) =>
          updateRoleMutation.mutate({ userId, newRole })
        }
        onRemoveMember={setMemberToRemove}
      />
    </div>
  );
}
