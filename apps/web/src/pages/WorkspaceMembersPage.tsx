import { type FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workspacesApi } from '../api/endpoints';
import type { WorkspaceRole } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Dropdown } from '../components/ui/Dropdown';
import { Input, Field, FormStack, FormActions, InlineFormRow } from '../components/ui/Form';
import { roleDropdownOptions } from '../lib/dropdown-options';
import { userDisplayName } from '../lib/format';
import {
  canChangeMemberRoles,
  canManageWorkspace,
  canRemoveMembers,
  canUpdateWorkspace,
  ROLE_LABELS,
} from '../lib/roles';

export function WorkspaceMembersPage() {
  const { workspaceId = '' } = useParams();
  const { user, activeWorkspace, refreshUser } = useAuth();
  const role = activeWorkspace?.role;
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('MEMBER');
  const [workspaceName, setWorkspaceName] = useState('');

  const { data: workspace } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => workspacesApi.get(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => workspacesApi.members.list(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      workspacesApi.members.invite(workspaceId, email, inviteRole),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace-members', workspaceId],
      });
      setEmail('');
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
        queryKey: ['workspace-members', workspaceId],
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      workspacesApi.members.remove(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace-members', workspaceId],
      });
    },
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: (name: string) => workspacesApi.update(workspaceId, { name }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      await refreshUser();
    },
  });

  function handleInvite(event: FormEvent) {
    event.preventDefault();
    inviteMutation.mutate();
  }

  function handleWorkspaceRename(event: FormEvent) {
    event.preventDefault();
    const name = workspaceName.trim() || workspace?.name;
    if (!name) {
      return;
    }
    updateWorkspaceMutation.mutate(name);
  }

  const canManage = role ? canManageWorkspace(role) : false;
  const canEditRoles = role ? canChangeMemberRoles(role) : false;
  const canRemove = role ? canRemoveMembers(role) : false;
  const canRename = role ? canUpdateWorkspace(role) : false;

  const displayName = workspace?.name ?? activeWorkspace?.name;

  return (
    <div className="space-y-8">
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

      {canRename ? (
        <Card title="Workspace settings" accent="emerald">
          <form onSubmit={handleWorkspaceRename}>
            <InlineFormRow align="end">
              <Field label="Workspace name" htmlFor="workspace-name" className="min-w-0 flex-1">
                <Input
                  id="workspace-name"
                  key={workspace?.name}
                  defaultValue={workspace?.name ?? ''}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
              </Field>
              <Button
                type="submit"
                variant="secondary"
                disabled={updateWorkspaceMutation.isPending}
              >
                Save
              </Button>
            </InlineFormRow>
          </form>
        </Card>
      ) : null}

      {canManage ? (
        <Card title="Invite member" accent="blue">
          <p className="mb-4 text-sm text-slate-500">
            User must already be registered. For clients, choose the Client
            role, then add them to a project.
          </p>
          <form onSubmit={handleInvite}>
            <FormStack>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email" htmlFor="invite-email">
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Role">
                  <Dropdown
                    value={inviteRole}
                    onChange={(value) => setInviteRole(value as WorkspaceRole)}
                    options={roleDropdownOptions()}
                    compactTrigger
                    fullWidth
                  />
                </Field>
              </div>
              <FormActions>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  Send invite
                </Button>
              </FormActions>
            </FormStack>
          </form>
        </Card>
      ) : null}

      <Card title="Members" accent="violet" className="overflow-visible">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4 w-[200px]">Role</th>
                  {canRemove ? <th className="pb-3 w-24" /> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      {userDisplayName(member.user)}
                    </td>
                    <td className="py-3 pr-4 text-slate-500">
                      {member.user.email}
                    </td>
                    <td className="py-3 pr-4">
                      {canEditRoles ? (
                        <Dropdown
                          value={member.role}
                          onChange={(value) =>
                            updateRoleMutation.mutate({
                              userId: member.userId,
                              newRole: value as WorkspaceRole,
                            })
                          }
                          options={roleDropdownOptions()}
                          compactTrigger
                          size="sm"
                          fullWidth
                        />
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                          {ROLE_LABELS[member.role]}
                        </span>
                      )}
                    </td>
                    {canRemove ? (
                      <td className="py-3 text-right">
                        {member.userId !== user?.id ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700"
                            disabled={removeMemberMutation.isPending}
                            onClick={() =>
                              removeMemberMutation.mutate(member.userId)
                            }
                          >
                            Remove
                          </Button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
