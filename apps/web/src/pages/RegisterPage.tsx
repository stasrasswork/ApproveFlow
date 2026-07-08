import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { useAuth } from '../auth/useAuth';
import { AuthFormLayout } from '../components/auth/AuthFormLayout';
import { TaskWorkflowSteps } from '../components/TaskWorkflowSteps';
import { getApiErrorMessage } from '../lib/api-error';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Input, Field, FormStack, FormActions } from '../components/ui/Form';

export function RegisterPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') ?? undefined;
  const presetEmail = searchParams.get('email') ?? '';
  const [name, setName] = useState('');
  const [email, setEmail] = useState(presetEmail);
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
      await authApi.register(email, password, name || undefined, inviteToken);
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-start justify-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-3xl space-y-4 sm:space-y-5">
        <section className="relative overflow-hidden rounded-2xl border border-brand-100/80 bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 p-4 shadow-sm sm:p-6 lg:hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(244,63,94,0.35),transparent_50%)]" />
          <div className="relative space-y-4">
            <p className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
              ApproveFlow
            </p>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
                Client approvals,
                <br />
                without the chaos.
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-brand-100 sm:text-base">
                Track every handoff, comment, and sign-off in one workspace - from
                brief to done.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-200">
                How it works
              </p>
              <TaskWorkflowSteps variant="dark" />
            </div>
          </div>
        </section>

        <Card className="w-full p-6 sm:p-8">
          <AuthFormLayout
            title="Create account"
            subtitle="Register, then create your agency workspace or join via invite."
            backLink={{ to: '/login', label: '← Back to sign in' }}
          >
            <form onSubmit={handleSubmit}>
              <FormStack>
                <Field label="Name" htmlFor="name">
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field label="Email" htmlFor="email">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Password" htmlFor="password">
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </Field>

                <ErrorAlert message={error} />

                <FormActions>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Creating…' : 'Create account'}
                  </Button>
                </FormActions>
              </FormStack>
            </form>
          </AuthFormLayout>
        </Card>
      </div>
    </div>
  );
}
