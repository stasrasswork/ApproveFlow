import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { userDisplayName } from '../lib/format';
import { ROLE_LABELS } from '../lib/roles';
import { NotificationBell } from './NotificationBell';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { Button, ButtonLink } from './ui/Button';

function SettingsIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

export function AppLayout() {
  const { user, activeWorkspace, logout } = useAuth();
  const currentWorkspaceId = activeWorkspace?.id;

  return (
    <div className="min-h-screen">
      <header className="glass-header sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
            <Link
              to="/"
              className="shrink-0 font-display text-xl font-bold tracking-tight text-gradient"
            >
              ApproveFlow
            </Link>
            <WorkspaceSwitcher />
          </div>

          {user ? (
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:shrink-0">
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
              <NotificationBell />
              {currentWorkspaceId ? (
                <ButtonLink
                  to={`/w/${currentWorkspaceId}/members`}
                  variant="secondary"
                  className="!px-0 h-11 w-11 min-w-11"
                  aria-label="Settings"
                >
                  <SettingsIcon className="h-5 w-5" />
                </ButtonLink>
              ) : null}
              <Button variant="secondary" onClick={logout} className="w-full sm:w-auto">
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
