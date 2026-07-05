type PageErrorProps = {
  message?: string;
  className?: string;
};

export function PageError({
  message = 'Something went wrong loading this page.',
  className = '',
}: PageErrorProps) {
  return (
    <p
      role="alert"
      className={`rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100 ${className}`.trim()}
    >
      {message}
    </p>
  );
}
