import type { WorkspaceMember, WorkspaceRole } from '../../api/types';
import { userDisplayName } from '../../lib/format';
import { ROLE_LABELS } from '../../lib/roles';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Dropdown } from '../ui/Dropdown';
import { LoadingState } from '../ui/LoadingState';
import { PageError } from '../ui/PageError';

type DropdownOption = { value: string; label: string };

type MembersTableCardProps = {
  members: WorkspaceMember[];
  membersLoading: boolean;
  membersError: boolean;
  currentUserId: string | undefined;
  canEditRoles: boolean;
  canRemove: boolean;
  removePending: boolean;
  roleOptions: DropdownOption[];
  onRoleChange: (userId: string, newRole: WorkspaceRole) => void;
  onRemoveMember: (member: { userId: string; name: string }) => void;
};

export function MembersTableCard({
  members,
  membersLoading,
  membersError,
  currentUserId,
  canEditRoles,
  canRemove,
  removePending,
  roleOptions,
  onRoleChange,
  onRemoveMember,
}: MembersTableCardProps) {
  return (
    <Card title="Members" accent="violet" className="overflow-visible">
      {membersError ? (
        <PageError message="Failed to load members." />
      ) : membersLoading ? (
        <LoadingState />
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
                          onRoleChange(member.userId, value as WorkspaceRole)
                        }
                        options={roleOptions}
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
                      {member.userId !== currentUserId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-rose-600 hover:text-rose-700"
                          disabled={removePending}
                          onClick={() =>
                            onRemoveMember({
                              userId: member.userId,
                              name: userDisplayName(member.user),
                            })
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
  );
}
