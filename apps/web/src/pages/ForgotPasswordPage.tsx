import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { AuthFormLayout } from '../components/auth/AuthFormLayout';
import { getApiErrorMessage } from '../lib/api-error';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { SuccessAlert } from '../components/ui/SuccessAlert';
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
        <AuthFormLayout
          title="Reset password"
          subtitle="Enter your email and we will send reset instructions if an account exists."
          backLink={{ to: '/login', label: '← Back to sign in' }}
        >
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
              <SuccessAlert message={message} />
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
        </AuthFormLayout>
      </Card>
    </div>
  );
}
