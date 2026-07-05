import type { FormEvent, ReactNode } from 'react';
import type { WorkspaceRole } from '../../api/types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Dropdown } from '../ui/Dropdown';
import { ErrorAlert } from '../ui/ErrorAlert';
import { SuccessAlert } from '../ui/SuccessAlert';
import { Input, Field, FormStack, FormActions } from '../ui/Form';

type DropdownOption = { value: string; label: string };

type InviteMemberCardProps = {
  email: string;
  inviteRole: WorkspaceRole;
  inviteError: string | null;
  inviteSuccess: string | null;
  devLinkContent: ReactNode;
  roleOptions: DropdownOption[];
  isPending: boolean;
  onEmailChange: (value: string) => void;
  onInviteRoleChange: (value: WorkspaceRole) => void;
  onSubmit: (event: FormEvent) => void;
};

export function InviteMemberCard({
  email,
  inviteRole,
  inviteError,
  inviteSuccess,
  devLinkContent,
  roleOptions,
  isPending,
  onEmailChange,
  onInviteRoleChange,
  onSubmit,
}: InviteMemberCardProps) {
  return (
    <Card title="Invite member" accent="blue">
      <p className="mb-4 text-sm text-slate-500">
        Invite by email. Registered users are added immediately; new users receive
        a link to create an account. For clients, choose the Client role, then
        add them to a project.
      </p>
      <form onSubmit={onSubmit}>
        <FormStack>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="invite-email">
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                required
              />
            </Field>
            <Field label="Role">
              <Dropdown
                value={inviteRole}
                onChange={(value) => onInviteRoleChange(value as WorkspaceRole)}
                options={roleOptions}
                compactTrigger
                fullWidth
              />
            </Field>
          </div>
          {inviteError ? <ErrorAlert message={inviteError} /> : null}
          <SuccessAlert message={inviteSuccess} />
          {devLinkContent}
          <FormActions>
            <Button type="submit" disabled={isPending}>
              Send invite
            </Button>
          </FormActions>
        </FormStack>
      </form>
    </Card>
  );
}
