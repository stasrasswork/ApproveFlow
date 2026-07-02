import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { getApiErrorMessage } from '../lib/api-error';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Input, Field, FormStack, FormActions } from '../components/ui/Form';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setDevToken(null);
    setSubmitting(true);
    try {
      const result = await authApi.forgotPassword(email);
      setMessage(result.message);
      if (result.resetToken) {
        setDevToken(result.resetToken);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Request failed'));
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
          <h1 className="mt-4 text-2xl font-bold">Reset password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your email and we will send reset instructions if an account
            exists.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <FormStack>
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>

            <ErrorAlert message={error} />
            {message ? (
              <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-100">
                {message}
              </p>
            ) : null}
            {devToken ? (
              <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 ring-1 ring-amber-100">
                Dev mode: use this link to reset —{' '}
                <Link
                  to={`/reset-password?token=${devToken}`}
                  className="font-semibold text-brand-600 hover:text-brand-700"
                >
                  set new password
                </Link>
              </p>
            ) : null}

            <FormActions>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send reset link'}
              </Button>
            </FormActions>
          </FormStack>
        </form>
      </Card>
    </div>
  );
}
