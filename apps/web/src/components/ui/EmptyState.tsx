import type { ReactNode } from 'react';

type EmptyStateProps = {
  children: ReactNode;
  className?: string;
};

export function EmptyState({ children, className = '' }: EmptyStateProps) {
  return (
    <p
      className={`rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500 ${className}`.trim()}
    >
      {children}
    </p>
  );
}
