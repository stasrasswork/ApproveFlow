type ErrorAlertProps = {
  message: string | null;
  className?: string;
};

export function ErrorAlert({ message, className = '' }: ErrorAlertProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      role="alert"
      aria-live="assertive"
      className={`rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 ring-1 ring-rose-100 ${className}`}
    >
      {message}
    </p>
  );
}
