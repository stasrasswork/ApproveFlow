import type { ReactNode } from 'react';

const accentBorder = {
  blue: 'border-l-brand-500',
  violet: 'border-l-violet-500',
  amber: 'border-l-amber-400',
  emerald: 'border-l-emerald-500',
  rose: 'border-l-rose-400',
} as const;

type Accent = keyof typeof accentBorder;

export function Card({
  title,
  actions,
  children,
  className = '',
  accent,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  accent?: Accent;
}) {
  return (
    <section className={`glass-panel p-6 ${className}`}>
      {title || actions ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {title ? (
            <h2
              className={`border-l-2 pl-3 text-sm font-semibold text-slate-800 ${accent ? accentBorder[accent] : 'border-l-slate-300'}`}
            >
              {title}
            </h2>
          ) : (
            <span />
          )}
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
