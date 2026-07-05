import { type FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { AuthFormLayout } from '../components/auth/AuthFormLayout';
import { TaskWorkflowSteps } from '../components/TaskWorkflowSteps';
import { getApiErrorMessage } from '../lib/api-error';
import { Button } from '../components/ui/Button';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Input, Field, FormStack, FormActions } from '../components/ui/Form';

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const from =
        (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Sign in failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-1/2 overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(244,63,94,0.35),transparent_50%)]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggIGQ9Ik0wIDYwVjBoNjB2NjB6IiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTMwIDMwSDMwLjVWMzAuNUgzMFYzMHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] opacity-40" />

        <div className="relative">
          <span className="font-display text-3xl font-bold text-white">
            ApproveFlow
          </span>
        </div>

        <div className="relative space-y-4">
          <h1 className="font-display text-4xl font-bold leading-tight text-white">
            Client approvals,
            <br />
            without the chaos.
          </h1>
          <p className="max-w-md text-lg text-brand-100">
            Track every handoff, comment, and sign-off in one workspace — from
            brief to done.
          </p>
        </div>

        <div className="relative space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-200">
            How it works
          </p>
          <TaskWorkflowSteps variant="dark" />
        </div>
      </aside>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="glass-panel w-full max-w-md p-8">
          <AuthFormLayout
            title="Welcome back"
            subtitle="Sign in to your workspace"
            headingAs="h2"
            headerExtra={
              <div className="mt-5 lg:hidden">
                <TaskWorkflowSteps variant="light" />
              </div>
            }
            footer={
              <>
                No account?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-brand-600 hover:text-brand-700"
                >
                  Create one
                </Link>
              </>
            }
          >
            <form onSubmit={handleSubmit}>
              <FormStack>
                <Field label="Email" htmlFor="email">
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Password" htmlFor="password">
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Field>

                <p className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Forgot password?
                  </Link>
                </p>

                <ErrorAlert message={error} />

                <FormActions>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Signing in…' : 'Sign in'}
                  </Button>
                </FormActions>
              </FormStack>
            </form>
          </AuthFormLayout>
        </div>
      </div>
    </div>
  );
}
