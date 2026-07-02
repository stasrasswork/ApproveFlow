import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { getApiErrorMessage } from '../lib/api-error';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorAlert } from '../components/ui/ErrorAlert';
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const result = await authApi.resetPassword(token, password);
      setMessage(result.message);
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Reset failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6">
          <Link
            to="/login"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            ← Back to sign in
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Choose new password</h1>
        </div>

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
            {message ? (
              <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-100">
                {message}
              </p>
            ) : null}

            <FormActions>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Saving…' : 'Update password'}
              </Button>
            </FormActions>
          </FormStack>
        </form>
      </Card>
    </div>
  );
}
