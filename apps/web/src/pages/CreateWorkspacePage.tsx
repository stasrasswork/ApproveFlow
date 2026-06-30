import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { workspacesApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, Field, FormStack, FormActions } from '../components/ui/Form';

export function CreateWorkspacePage() {
  const { user, refreshUser, setActiveWorkspaceId } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => workspacesApi.create(name.trim()),
    onSuccess: async (workspace) => {
      await refreshUser();
      setActiveWorkspaceId(workspace.id);
      navigate(`/w/${workspace.id}/projects`, { replace: true });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to create workspace');
    },
  });

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.workspaces.length > 0) {
    const workspaceId = user.workspaces[0].id;
    return <Navigate to={`/w/${workspaceId}/projects`} replace />;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    createMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
          Create your workspace
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Set up an agency workspace. You will be the admin and can invite
          managers, members, and clients.
        </p>
      </div>

      <Card title="Workspace details" accent="blue">
        <form onSubmit={handleSubmit}>
          <FormStack>
            <Field label="Workspace name" htmlFor="workspace-name">
              <Input
                id="workspace-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Creative Agency"
                required
                autoFocus
              />
            </Field>

            {error ? (
              <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <FormActions>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create workspace'}
              </Button>
            </FormActions>
          </FormStack>
        </form>
      </Card>

      <p className="text-center text-sm text-slate-500">
        Already invited?{' '}
        <Link to="/" className="font-medium text-brand-600 hover:text-brand-700">
          Go to your projects
        </Link>
      </p>
    </div>
  );
}
