import { Link } from 'react-router-dom';
import { MemberRemoveDialog } from '../components/MemberRemoveDialog';
import { InviteMemberCard } from '../components/settings/InviteMemberCard';
import { MembersTableCard } from '../components/settings/MembersTableCard';
import { ProfileSettingsCard } from '../components/settings/ProfileSettingsCard';
import { WorkspaceSettingsCard } from '../components/settings/WorkspaceSettingsCard';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingState } from '../components/ui/LoadingState';
import { PageError } from '../components/ui/PageError';
import { useWorkspaceMembersPageModel } from './models/useWorkspaceMembersPageModel';

export function WorkspaceMembersPage() {
  const model = useWorkspaceMembersPageModel();

  if (model.workspaceError) {
    return <PageError message="Failed to load workspace settings." />;
  }

  if (model.workspaceLoading && !model.workspace) {
    return <LoadingState label="Loading settings…" />;
  }

  return (
    <div className="space-y-8">
      <ConfirmDialog
        open={model.confirmDeleteWorkspace}
        title="Delete workspace?"
        description="This will permanently delete the workspace, all projects, and tasks. This action cannot be undone."
        confirmLabel="Delete workspace"
        loading={model.deleteWorkspaceMutation.isPending}
        onConfirm={() => model.deleteWorkspaceMutation.mutate()}
        onCancel={() => model.setConfirmDeleteWorkspace(false)}
      />
      <MemberRemoveDialog
        scope="workspace"
        member={model.memberToRemove}
        isPending={model.removeMemberMutation.isPending}
        onClose={() => model.setMemberToRemove(null)}
        onConfirm={() => {
          if (model.memberToRemove) {
            model.removeMemberMutation.mutate(model.memberToRemove.userId);
          }
        }}
      />
      <div>
        <Link
          to={`/w/${model.workspaceId}/projects`}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          ← All projects
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-500">{model.displayName}</p>
      </div>

      <ProfileSettingsCard
        user={model.user}
        profileError={model.profileError}
        profileSuccess={model.profileSuccess}
        isPending={model.profileMutation.isPending}
        onProfileNameChange={model.setProfileName}
        onSubmit={model.handleProfileSubmit}
      />

      {model.canRename ? (
        <WorkspaceSettingsCard
          workspace={model.workspace}
          settingsError={model.settingsError}
          canDelete={model.canDelete}
          updatePending={model.updateWorkspaceMutation.isPending}
          deletePending={model.deleteWorkspaceMutation.isPending}
          onWorkspaceNameChange={model.setWorkspaceName}
          onWorkspaceSlugChange={model.setWorkspaceSlug}
          onSubmit={model.handleWorkspaceSettings}
          onDeleteClick={() => model.setConfirmDeleteWorkspace(true)}
        />
      ) : null}

      {model.canManage ? (
        <InviteMemberCard
          email={model.email}
          inviteRole={model.inviteRole}
          inviteError={model.inviteError}
          inviteSuccess={model.inviteSuccess}
          roleOptions={model.roleOptions}
          isPending={model.inviteMutation.isPending}
          onEmailChange={model.setEmail}
          onInviteRoleChange={model.setInviteRole}
          onSubmit={model.handleInvite}
          devLinkContent={
            model.inviteDevLink ? (
              <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 ring-1 ring-amber-100">
                Dev mode: share{' '}
                <Link
                  to={model.inviteDevLink}
                  className="font-semibold text-brand-600 hover:text-brand-700"
                >
                  registration link
                </Link>
              </p>
            ) : null
          }
        />
      ) : null}

      {model.canViewMembers ? (
        <MembersTableCard
          members={model.members}
          membersLoading={model.membersLoading}
          membersError={model.membersError}
          currentUserId={model.user?.id}
          canEditRoles={model.canEditRoles}
          canRemove={model.canRemove}
          removePending={model.removeMemberMutation.isPending}
          roleOptions={model.roleOptions}
          onRoleChange={(userId, newRole) =>
            model.updateRoleMutation.mutate({ userId, newRole })
          }
          onRemoveMember={model.setMemberToRemove}
        />
      ) : null}
    </div>
  );
}
