import type { FormEvent } from 'react';
import type { Workspace } from '../../api/types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ErrorAlert } from '../ui/ErrorAlert';
import { Input, Field, FormStack, FormActions } from '../ui/Form';

type WorkspaceSettingsCardProps = {
  workspace: Workspace | undefined;
  settingsError: string | null;
  canDelete: boolean;
  updatePending: boolean;
  deletePending: boolean;
  onWorkspaceNameChange: (value: string) => void;
  onWorkspaceSlugChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onDeleteClick: () => void;
};

export function WorkspaceSettingsCard({
  workspace,
  settingsError,
  canDelete,
  updatePending,
  deletePending,
  onWorkspaceNameChange,
  onWorkspaceSlugChange,
  onSubmit,
  onDeleteClick,
}: WorkspaceSettingsCardProps) {
  return (
    <Card title="Workspace settings" accent="emerald">
      <form onSubmit={onSubmit}>
        <FormStack>
          <Field label="Workspace name" htmlFor="workspace-name">
            <Input
              id="workspace-name"
              key={`name-${workspace?.name}`}
              defaultValue={workspace?.name ?? ''}
              onChange={(e) => onWorkspaceNameChange(e.target.value)}
            />
          </Field>
          <Field label="URL slug" htmlFor="workspace-slug">
            <Input
              id="workspace-slug"
              key={`slug-${workspace?.slug}`}
              defaultValue={workspace?.slug ?? ''}
              onChange={(e) => onWorkspaceSlugChange(e.target.value)}
              spellCheck={false}
              placeholder="my-agency"
            />
          </Field>
          {settingsError ? <ErrorAlert message={settingsError} /> : null}
          <FormActions>
            <Button type="submit" variant="secondary" disabled={updatePending}>
              Save changes
            </Button>
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="text-rose-600 hover:text-rose-700"
                disabled={deletePending}
                onClick={onDeleteClick}
              >
                Delete workspace
              </Button>
            ) : null}
          </FormActions>
        </FormStack>
      </form>
    </Card>
  );
}
