import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ButtonLink } from '../components/ui/Button';

export function HomePage() {
  const { user, activeWorkspace } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.workspaces.length === 0) {
    return (
      <div className="glass-panel mx-auto max-w-lg p-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-2xl">
          ○
        </span>
        <h1 className="mt-4 text-xl font-bold">Welcome to ApproveFlow</h1>
        <p className="mt-2 text-sm text-slate-500">
          Create a workspace for your agency, or wait for an invite from an
          existing team.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <ButtonLink to="/create-workspace">Create workspace</ButtonLink>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Sign in with another account
          </Link>
        </div>
      </div>
    );
  }

  const workspaceId = activeWorkspace?.id ?? user.workspaces[0].id;
  return <Navigate to={`/w/${workspaceId}/projects`} replace />;
}
