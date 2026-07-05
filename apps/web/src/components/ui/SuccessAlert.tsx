type SuccessAlertProps = {
  message: string | null;
  className?: string;
};

export function SuccessAlert({ message, className = '' }: SuccessAlertProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      role="status"
      className={`rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-100 ${className}`}
    >
      {message}
    </p>
  );
}
