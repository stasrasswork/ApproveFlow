import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { AuthFormLayout } from '../components/auth/AuthFormLayout';
import { getApiErrorMessage } from '../lib/api-error';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { SuccessAlert } from '../components/ui/SuccessAlert';
import { Input, Field, FormStack, FormActions } from '../components/ui/Form';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => navigate('/login', { replace: true }),
      1500,
    );
    return () => window.clearTimeout(timeoutId);
  }, [message, navigate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const result = await authApi.resetPassword(token, password);
      setMessage(result.message);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Reset failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <AuthFormLayout
          title="Choose new password"
          backLink={{ to: '/login', label: '← Back to sign in' }}
        >
          <form onSubmit={handleSubmit}>
            <FormStack>
              {!tokenFromUrl ? (
                <Field label="Reset token" htmlFor="token">
                  <Input
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                  />
                </Field>
              ) : null}
              <Field label="New password" htmlFor="password">
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
              <SuccessAlert message={message} />

              <FormActions>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Update password'}
                </Button>
              </FormActions>
            </FormStack>
          </form>
        </AuthFormLayout>
      </Card>
    </div>
  );
}
