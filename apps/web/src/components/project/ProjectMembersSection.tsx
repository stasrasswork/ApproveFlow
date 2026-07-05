import type { WorkspaceMember, WorkspaceRole } from '../../api/types';
import { userDisplayName } from '../../lib/format';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Dropdown } from '../ui/Dropdown';
import { Field, FormActions } from '../ui/Form';
import { RoleBadge } from '../ui/RoleBadge';

type DropdownOption = { value: string; label: string };

type ProjectMembersSectionProps = {
  projectMembers: Array<{ id: string; userId: string; user: WorkspaceMember['user'] }>;
  roleByUserId: Map<string, WorkspaceRole>;
  availableForProject: WorkspaceMember[];
  memberUserId: string;
  addPending: boolean;
  removePending: boolean;
  onMemberUserIdChange: (value: string) => void;
  onAddMember: () => void;
  onRemoveMember: (member: { userId: string; name: string }) => void;
  memberDropdownOptions: DropdownOption[];
};

export function ProjectMembersSection({
  projectMembers,
  roleByUserId,
  availableForProject,
  memberUserId,
  addPending,
  removePending,
  onMemberUserIdChange,
  onAddMember,
  onRemoveMember,
  memberDropdownOptions,
}: ProjectMembersSectionProps) {
  return (
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
            </li>
          );
        })}
      </ul>
      {availableForProject.length > 0 ? (
        <div className="space-y-4 border-t border-slate-100 pt-5">
          <Field label="Add from workspace">
            <Dropdown
              value={memberUserId}
              onChange={onMemberUserIdChange}
              placeholder="Select user"
              options={memberDropdownOptions}
              compactTrigger
              fullWidth
            />
          </Field>
          <FormActions>
            <Button
              variant="secondary"
              disabled={!memberUserId || addPending}
              onClick={onAddMember}
            >
              Add member
            </Button>
          </FormActions>
        </div>
      ) : null}
    </Card>
  );
}
