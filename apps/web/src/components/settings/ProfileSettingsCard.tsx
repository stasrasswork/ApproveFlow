import type { FormEvent } from 'react';
import type { MeResult } from '../../api/types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ErrorAlert } from '../ui/ErrorAlert';
import { SuccessAlert } from '../ui/SuccessAlert';
import { Input, Field, FormStack, FormActions } from '../ui/Form';

type ProfileSettingsCardProps = {
  user: MeResult | null;
  profileError: string | null;
  profileSuccess: string | null;
  isPending: boolean;
  onProfileNameChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function ProfileSettingsCard({
  user,
  profileError,
  profileSuccess,
  isPending,
  onProfileNameChange,
  onSubmit,
}: ProfileSettingsCardProps) {
  return (
    <Card title="Your profile" accent="blue">
      <form onSubmit={onSubmit}>
        <FormStack>
          <Field label="Display name" htmlFor="display-name">
            <Input
              id="display-name"
              key={`display-name-${user?.name}`}
              defaultValue={user?.name ?? ''}
              onChange={(e) => onProfileNameChange(e.target.value)}
              placeholder="How others see you"
            />
          </Field>
          <p className="text-sm text-slate-500">Signed in as {user?.email}</p>
          {profileError ? <ErrorAlert message={profileError} /> : null}
          <SuccessAlert message={profileSuccess} />
          <FormActions>
            <Button type="submit" variant="secondary" disabled={isPending}>
              Save name
            </Button>
          </FormActions>
        </FormStack>
      </form>
    </Card>
  );
}
