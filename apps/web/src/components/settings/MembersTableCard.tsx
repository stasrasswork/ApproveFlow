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
        <>
          <ul className="space-y-3 sm:hidden">
            {members.map((member) => (
              <li
                key={member.id}
                className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-4"
              >
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {userDisplayName(member.user)}
                    </p>
                    <p className="mt-1 break-all text-sm text-slate-500">
                      {member.user.email}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Role
                    </p>
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
                  </div>
                  {canRemove && member.userId !== currentUserId ? (
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
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto overflow-y-visible sm:block">
            <table className="w-full min-w-[460px] text-sm lg:min-w-[520px]">
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
                  <td className="py-3 pr-4 break-all text-slate-500">
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
        </>
      )}
    </Card>
  );
}
