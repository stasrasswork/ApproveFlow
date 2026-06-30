import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { userDisplayName } from '../lib/format';
import { ROLE_LABELS } from '../lib/roles';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { Button, ButtonLink } from './ui/Button';

export function AppLayout() {
  const { user, activeWorkspace, logout } = useAuth();
  const currentWorkspaceId = activeWorkspace?.id;

  return (
    <div className="min-h-screen">
      <header className="glass-header sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
            <Link
              to="/"
              className="shrink-0 font-display text-xl font-bold tracking-tight text-gradient"
            >
              ApproveFlow
            </Link>
            <WorkspaceSwitcher />
          </div>

          {user ? (
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden flex-col justify-center px-2 text-right md:flex">
                <p className="text-sm font-semibold leading-tight text-slate-800">
                  {userDisplayName(user)}
                </p>
                {activeWorkspace ? (
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.06em] text-slate-400">
                    {ROLE_LABELS[activeWorkspace.role]}
                  </p>
                ) : null}
              </div>
              <span className="hidden h-6 w-px bg-slate-200 md:block" aria-hidden />
              {currentWorkspaceId ? (
                <ButtonLink to={`/w/${currentWorkspaceId}/members`}>
                  Settings
                </ButtonLink>
              ) : null}
              <Button variant="secondary" onClick={logout}>
                Sign out
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="animate-fade-up">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
