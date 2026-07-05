import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { useAuth } from '../auth/useAuth';
import { AuthFormLayout } from '../components/auth/AuthFormLayout';
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
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8">
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
  );
}
