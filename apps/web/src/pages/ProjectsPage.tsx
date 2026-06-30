import { type FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { ProjectStatusBadge } from '../components/ui/ProjectStatusBadge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Input, Textarea, Field, FormStack, FormActions } from '../components/ui/Form';
import { getApiErrorMessage } from '../lib/api-error';
import { isAgencyRole } from '../lib/roles';

export function ProjectsPage() {
  const { workspaceId = '' } = useParams();
  const { activeWorkspace } = useAuth();
  const role = activeWorkspace?.role;
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => projectsApi.list(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      projectsApi.create(workspaceId, name, description || undefined),
    onSuccess: () => {
      setCreateError(null);
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
      setShowCreate(false);
      setName('');
      setDescription('');
    },
    onError: (err) => {
      setCreateError(getApiErrorMessage(err, 'Failed to create project'));
    },
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    createMutation.mutate();
  }

  const canCreate = role ? isAgencyRole(role) : false;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          Projects
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-900">
          {activeWorkspace?.name ?? 'Workspace'}
        </h1>
      </div>

      <Card
        title="All projects"
        accent="blue"
        actions={
          canCreate ? (
            <Button type="button" onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? 'Cancel' : '+ New project'}
            </Button>
          ) : undefined
        }
      >
        {showCreate ? (
          <div className="mb-5 rounded-xl border border-slate-200/70 bg-slate-50/50 p-4">
            <form onSubmit={handleCreate}>
              <FormStack>
                <Field label="Name" htmlFor="project-name">
                  <Input
                    id="project-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Description" htmlFor="project-desc">
                  <Textarea
                    id="project-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Field>
                <ErrorAlert message={createError} />
                <FormActions>
                  <Button type="submit" disabled={createMutation.isPending}>
                    Create project
                  </Button>
                </FormActions>
              </FormStack>
            </form>
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
            No projects yet. Create one to get started.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/w/${workspaceId}/projects/${project.id}`}
                className="group block rounded-xl border border-slate-200/70 bg-white px-4 py-4 transition hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-900 group-hover:text-brand-700">
                      {project.name}
                    </h2>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <span className="text-brand-400 opacity-0 transition group-hover:opacity-100">
                    →
                  </span>
                </div>
                {project.description ? (
                  <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
                    {project.description}
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm italic text-slate-400">
                    No description
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
