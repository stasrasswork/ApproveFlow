type LoadingStateProps = {
  label?: string;
  className?: string;
};

export function LoadingState({
  label = 'Loading…',
  className = '',
}: LoadingStateProps) {
  return (
    <p className={`text-sm text-slate-500 ${className}`.trim()} role="status">
      {label}
    </p>
  );
}
